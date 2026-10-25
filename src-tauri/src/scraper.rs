/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use chrono::{DateTime, Utc};
use log::{info, warn};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, USER_AGENT};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use tokio::time::sleep;

use crate::calendar::{get_standard_fallback_holidays, TimeIrEvent};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthEventsResult {
    pub events: Vec<TimeIrEvent>,
    pub is_offline: bool,
    pub cached_at: Option<String>,
    pub last_error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CachedMonthData {
    pub year: i32,
    pub month: u32,
    pub timestamp: String,
    pub events: Vec<TimeIrEvent>,
}

const REALISTIC_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/// Fetch time.ir month events with disk cache, once-a-day refresh limit, timeout, backoff retry, and structured logging.
pub async fn fetch_month_events_with_cache(
    cache_dir: PathBuf,
    year: i32,
    month: u32,
    force_refresh: bool,
) -> MonthEventsResult {
    let cache_file = cache_dir.join(format!("month_events_{}_{:02}.json", year, month));

    // 1. Check disk cache first if not force_refresh
    if !force_refresh {
        if let Ok(content) = fs::read_to_string(&cache_file) {
            if let Ok(cached) = serde_json::from_str::<CachedMonthData>(&content) {
                if let Ok(saved_time) = DateTime::parse_from_rfc3339(&cached.timestamp) {
                    let now = Utc::now();
                    let age = now.signed_duration_since(saved_time.with_timezone(&Utc));
                    if age.num_hours() < 24 {
                        info!(
                            "[time.ir] Cache hit for year {} month {} (age: {} hours, events: {})",
                            year,
                            month,
                            age.num_hours(),
                            cached.events.len()
                        );
                        return MonthEventsResult {
                            events: cached.events,
                            is_offline: false,
                            cached_at: Some(cached.timestamp),
                            last_error: None,
                        };
                    }
                }
            }
        }
    }

    // 2. Fetch fresh from time.ir with retry and logging
    info!("[time.ir] Requesting fresh events for year {}, month {} from time.ir...", year, month);
    match scrape_time_ir_with_backoff(year, month).await {
        Ok(scraped_events) => {
            let timestamp = Utc::now().to_rfc3339();
            let holidays_count = scraped_events.iter().filter(|e| e.is_holiday).count();
            info!(
                "[time.ir] Parse success: total {} events, {} official holidays for year {} month {}",
                scraped_events.len(),
                holidays_count,
                year,
                month
            );

            let cache_data = CachedMonthData {
                year,
                month,
                timestamp: timestamp.clone(),
                events: scraped_events.clone(),
            };

            let _ = fs::create_dir_all(&cache_dir);
            if let Ok(json_str) = serde_json::to_string_pretty(&cache_data) {
                let _ = fs::write(&cache_file, json_str);
            }

            MonthEventsResult {
                events: scraped_events,
                is_offline: false,
                cached_at: Some(timestamp),
                last_error: None,
            }
        }
        Err(err) => {
            let err_msg = err.to_string();
            warn!("[time.ir] Fetch failed: {}. Checking existing cache or fallback.", err_msg);

            // If an older cache file exists on disk, use it with is_offline = true
            if let Ok(content) = fs::read_to_string(&cache_file) {
                if let Ok(cached) = serde_json::from_str::<CachedMonthData>(&content) {
                    info!(
                        "[time.ir] Using previous disk cache ({} events) due to network error",
                        cached.events.len()
                    );
                    return MonthEventsResult {
                        events: cached.events,
                        is_offline: true,
                        cached_at: Some(cached.timestamp),
                        last_error: Some(err_msg),
                    };
                }
            }

            // Built-in offline fallback: standard Iranian national statutory holidays
            let fallback_events = get_standard_fallback_holidays(year, month);
            info!(
                "[time.ir] Falling back to built-in calendar rules ({} statutory events)",
                fallback_events.len()
            );

            MonthEventsResult {
                events: fallback_events,
                is_offline: true,
                cached_at: None,
                last_error: Some(err_msg),
            }
        }
    }
}

/// Perform HTTP GET with realistic browser headers, 10s timeout, and 3 exponential backoff attempts.
async fn scrape_time_ir_with_backoff(
    year: i32,
    month: u32,
) -> Result<Vec<TimeIrEvent>, Box<dyn std::error::Error + Send + Sync>> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(REALISTIC_USER_AGENT));
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
    );
    headers.insert(
        ACCEPT_LANGUAGE,
        HeaderValue::from_static("fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7"),
    );

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .timeout(Duration::from_secs(10))
        .build()?;

    let url = format!("https://www.time.ir/fa/event/year/{}/month/{}", year, month);

    let mut backoff = Duration::from_secs(1);
    let mut last_err = String::new();

    for attempt in 1..=3 {
        info!("[time.ir] Attempt {} to fetch {}", attempt, url);
        match client.get(&url).send().await {
            Ok(response) => {
                let status = response.status();
                info!("[time.ir] HTTP response status: {}", status);
                if status.is_success() {
                    let html_text = response.text().await?;
                    let events = parse_time_ir_html(&html_text, year, month)?;
                    info!("[time.ir] Successfully extracted {} events from DOM", events.len());
                    return Ok(events);
                } else {
                    last_err = format!("HTTP error: {}", status);
                }
            }
            Err(e) => {
                last_err = format!("Network error: {}", e);
                warn!("[time.ir] Attempt {} failed: {}", attempt, last_err);
            }
        }

        if attempt < 3 {
            sleep(backoff).await;
            backoff *= 2;
        }
    }

    Err(format!("Scrape failed after 3 attempts: {}", last_err).into())
}

/// Defensive HTML parser extracting events and holiday badges.
fn parse_time_ir_html(
    html_text: &str,
    year: i32,
    month: u32,
) -> Result<Vec<TimeIrEvent>, Box<dyn std::error::Error + Send + Sync>> {
    let document = Html::parse_document(html_text);
    let mut events = Vec::new();

    let li_selector = Selector::parse("ul.list-unstyled > li").map_err(|e| format!("{:?}", e))?;
    let span_holiday_selector =
        Selector::parse(".eventHoliday, .holiday, span.text-danger").map_err(|e| format!("{:?}", e))?;

    for (idx, li_element) in document.select(&li_selector).enumerate() {
        let text = li_element.text().collect::<Vec<_>>().join(" ").trim().to_string();
        if text.is_empty() {
            continue;
        }

        let is_holiday = li_element
            .value()
            .classes()
            .any(|c| c.contains("Holiday") || c.contains("holiday"))
            || li_element.select(&span_holiday_selector).next().is_some()
            || text.contains("[تعطیل]");

        let day_num = extract_day_from_text(&text).unwrap_or(1);
        let clean_title = text.replace("[تعطیل]", "").trim().to_string();

        events.push(TimeIrEvent {
            id: format!("timeir-{}-{}-{}-{}", year, month, day_num, idx),
            jalali_year: year,
            jalali_month: month,
            jalali_day: day_num,
            is_holiday,
            title: clean_title,
            description: None,
            source: "time.ir".to_string(),
        });
    }

    // Secondary fallback for alternative DOM markup
    if events.is_empty() {
        let event_calendar_sel = Selector::parse(".eventsList, .event-item").map_err(|e| format!("{:?}", e))?;
        for (idx, elem) in document.select(&event_calendar_sel).enumerate() {
            let text = elem.text().collect::<Vec<_>>().join(" ").trim().to_string();
            if !text.is_empty() {
                let day_num = extract_day_from_text(&text).unwrap_or(1);
                let is_holiday = text.contains("تعطیل")
                    || elem.value().classes().any(|c| c.contains("holiday"));

                events.push(TimeIrEvent {
                    id: format!("timeir-alt-{}-{}-{}-{}", year, month, day_num, idx),
                    jalali_year: year,
                    jalali_month: month,
                    jalali_day: day_num,
                    is_holiday,
                    title: text,
                    description: None,
                    source: "time.ir".to_string(),
                });
            }
        }
    }

    Ok(events)
}

fn extract_day_from_text(text: &str) -> Option<u32> {
    let mut num_str = String::new();
    for ch in text.chars() {
        match ch {
            '۰'..='۹' => {
                let digit = match ch {
                    '۰' => '0',
                    '۱' => '1',
                    '۲' => '2',
                    '۳' => '3',
                    '۴' => '4',
                    '۵' => '5',
                    '۶' => '6',
                    '۷' => '7',
                    '۸' => '8',
                    '۹' => '9',
                    _ => '0',
                };
                num_str.push(digit);
            }
            '0'..='9' => num_str.push(ch),
            _ => {
                if !num_str.is_empty() {
                    break;
                }
            }
        }
    }

    if let Ok(val) = num_str.parse::<u32>() {
        if (1..=31).contains(&val) {
            return Some(val);
        }
    }
    None
}
