/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use chrono::{Datelike, Local, Timelike};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::shared::calendar::gregorian_to_jalali;
use crate::shared::notes::{AppSettings, PersonalNote};

/// Spawns background worker checking reminders every 30 seconds and sending Windows notifications.
pub fn spawn_reminder_watcher(
    notes_arc: Arc<Mutex<Vec<PersonalNote>>>,
    settings_arc: Arc<Mutex<AppSettings>>,
    app_handle: AppHandle,
) {
    tauri::async_runtime::spawn(async move {
        let mut last_notified_minute = 999;

        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;

            let now = Local::now();
            let current_minute = now.minute();

            if current_minute == last_notified_minute {
                continue;
            }

            let notifications_enabled = {
                let s = settings_arc.lock().unwrap_or_else(|e| e.into_inner());
                s.enable_notifications
            };

            if !notifications_enabled {
                continue;
            }

            let current_time_str = format!("{:02}:{:02}", now.hour(), now.minute());
            let (jy, jm, jd) = gregorian_to_jalali(now.year(), now.month(), now.day());

            let notes_to_notify: Vec<PersonalNote> = {
                let list = notes_arc.lock().unwrap_or_else(|e| e.into_inner());
                list.iter()
                    .filter(|n| {
                        n.has_reminder
                            && !n.is_completed
                            && n.jalali_year == jy
                            && n.jalali_month == jm
                            && n.jalali_day == jd
                            && n.reminder_time.as_deref() == Some(&current_time_str)
                    })
                    .cloned()
                    .collect()
            };

            for note in notes_to_notify {
                let title = format!("🔔 یادآور تقویم: {}", note.title);
                let body = if !note.description.is_empty() {
                    note.description.clone()
                } else {
                    format!(
                        "زمان یادآوری رویداد فرا رسیده است (ساعت {})",
                        current_time_str
                    )
                };

                let _ = app_handle
                    .notification()
                    .builder()
                    .title(title)
                    .body(body)
                    .show();
            }

            last_notified_minute = current_minute;
        }
    });
}
