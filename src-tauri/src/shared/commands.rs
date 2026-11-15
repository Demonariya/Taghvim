/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::shared::calendar::{
    get_persian_day_of_week, gregorian_to_jalali, hijri_to_jalali, jalali_to_gregorian,
    jalali_to_hijri, to_persian_digits, DateConversionResponse, DatePart, PERSIAN_WEEK_DAYS,
};
use crate::shared::diagnostics::{StartupDiagnostics, StartupDiagnosticsReport};
use crate::shared::notes::{AppSettings, NotesManager, PersonalNote};
use crate::shared::scraper::{fetch_month_events_with_cache, MonthEventsResult};

pub struct AppState {
    pub notes_manager: Arc<NotesManager>,
    pub diagnostics: StartupDiagnostics,
}

#[tauri::command]
pub async fn get_month_events(
    app: AppHandle,
    year: i32,
    month: u32,
    force_refresh: Option<bool>,
) -> Result<MonthEventsResult, String> {
    let cache_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => std::env::temp_dir().join("com.taghvim.calendar"),
    }
    .join("events_cache");

    Ok(fetch_month_events_with_cache(
        cache_dir,
        year,
        month,
        force_refresh.unwrap_or(false),
    )
    .await)
}

#[tauri::command]
pub fn get_notes(state: State<AppState>) -> Result<Vec<PersonalNote>, String> {
    Ok(state.notes_manager.get_notes())
}

#[tauri::command]
pub fn save_note(state: State<AppState>, note: PersonalNote) -> Result<Vec<PersonalNote>, String> {
    state.notes_manager.save_note(note)
}

#[tauri::command]
pub fn delete_note(state: State<AppState>, id: String) -> Result<Vec<PersonalNote>, String> {
    state.notes_manager.delete_note(&id)
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    Ok(state.notes_manager.get_settings())
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: AppSettings) -> Result<(), String> {
    state.notes_manager.save_settings(settings)
}

#[tauri::command]
pub fn convert_date(
    source_type: String,
    year: i32,
    month: u32,
    day: u32,
) -> Result<DateConversionResponse, String> {
    let (jy, jm, jd) = match source_type.as_str() {
        "gregorian" => gregorian_to_jalali(year, month, day),
        "hijri" => hijri_to_jalali(year, month, day),
        _ => (year, month, day),
    };

    let (gy, gm, gd) = jalali_to_gregorian(jy, jm, jd);
    let (hy, hm, hd) = jalali_to_hijri(jy, jm, jd);
    let dow = get_persian_day_of_week(jy, jm, jd);

    Ok(DateConversionResponse {
        jalali: DatePart {
            year: jy,
            month: jm,
            day: jd,
            formatted: format!(
                "{}/{:02}/{:02}",
                to_persian_digits(jy),
                to_persian_digits(jm),
                to_persian_digits(jd)
            ),
        },
        gregorian: DatePart {
            year: gy,
            month: gm,
            day: gd,
            formatted: format!("{}/{:02}/{:02}", gy, gm, gd),
        },
        hijri: DatePart {
            year: hy,
            month: hm,
            day: hd,
            formatted: format!(
                "{}/{:02}/{:02}",
                to_persian_digits(hy),
                to_persian_digits(hm),
                to_persian_digits(hd)
            ),
        },
        day_of_week_name: PERSIAN_WEEK_DAYS[dow].to_string(),
    })
}

#[tauri::command]
pub fn get_startup_diagnostics(state: State<AppState>) -> Result<StartupDiagnosticsReport, String> {
    Ok(state.diagnostics.report())
}
