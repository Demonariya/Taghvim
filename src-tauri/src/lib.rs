/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

#[cfg(desktop)]
use tauri::WindowEvent;
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

#[allow(dead_code)]
mod calendar;
mod notes;
mod scraper;

#[cfg(desktop)]
mod tray;
#[cfg(desktop)]
mod tray_icon;

use calendar::{
    gregorian_to_jalali, jalali_to_gregorian, jalali_to_hijri,
    to_persian_digits, DateConversionResponse, DatePart, PERSIAN_WEEK_DAYS,
};
use notes::{AppSettings, NotesManager, PersonalNote};
use scraper::{fetch_month_events_with_cache, MonthEventsResult};

struct AppState {
    notes_manager: Arc<NotesManager>,
}

#[tauri::command]
async fn get_month_events(
    app: AppHandle,
    year: i32,
    month: u32,
    force_refresh: Option<bool>,
) -> Result<MonthEventsResult, String> {
    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("events_cache");

    let result = fetch_month_events_with_cache(
        cache_dir,
        year,
        month,
        force_refresh.unwrap_or(false),
    )
    .await;

    Ok(result)
}

#[tauri::command]
fn get_notes(state: State<AppState>) -> Result<Vec<PersonalNote>, String> {
    Ok(state.notes_manager.get_notes())
}

#[tauri::command]
fn save_note(state: State<AppState>, note: PersonalNote) -> Result<Vec<PersonalNote>, String> {
    Ok(state.notes_manager.save_note(note))
}

#[tauri::command]
fn delete_note(state: State<AppState>, id: String) -> Result<Vec<PersonalNote>, String> {
    Ok(state.notes_manager.delete_note(&id))
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    Ok(state.notes_manager.get_settings())
}

#[tauri::command]
fn save_settings(state: State<AppState>, settings: AppSettings) -> Result<(), String> {
    state.notes_manager.save_settings(settings);
    Ok(())
}

#[tauri::command]
fn convert_date(
    source_type: String,
    year: i32,
    month: u32,
    day: u32,
) -> Result<DateConversionResponse, String> {
    let (jy, jm, jd) = match source_type.as_str() {
        "gregorian" => gregorian_to_jalali(year, month, day),
        "hijri" => {
            let (gy, gm, gd) = jalali_to_gregorian(1400, 1, 1);
            gregorian_to_jalali(gy, gm, gd)
        }
        _ => (year, month, day),
    };

    let (gy, gm, gd) = jalali_to_gregorian(jy, jm, jd);
    let (hy, hm, hd) = jalali_to_hijri(jy, jm, jd);
    let dow = calendar::get_persian_day_of_week(jy, jm, jd);

    Ok(DateConversionResponse {
        jalali: DatePart {
            year: jy,
            month: jm,
            day: jd,
            formatted: format!("{}/{:02}/{:02}", to_persian_digits(jy), to_persian_digits(jm), to_persian_digits(jd)),
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
            formatted: format!("{}/{:02}/{:02}", to_persian_digits(hy), to_persian_digits(hm), to_persian_digits(hd)),
        },
        day_of_week_name: PERSIAN_WEEK_DAYS[dow].to_string(),
    })
}

#[cfg(desktop)]
#[tauri::command]
fn minimize_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.minimize();
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn toggle_maximize_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_maximized().unwrap_or(false) {
            let _ = w.unmaximize();
        } else {
            let _ = w.maximize();
        }
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn hide_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn open_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
    if let Some(p) = app.get_webview_window("tray-popup") {
        let _ = p.hide();
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn close_app() -> Result<(), String> {
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }))
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ))
            .plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }

    builder = builder.plugin(tauri_plugin_notification::init());

    builder
        .setup(|app| {
            let app_data_dir = match app.path().app_data_dir() {
                Ok(dir) => dir,
                Err(err) => {
                    log::warn!("Failed to resolve app_data_dir ({:?}), using fallback temp dir", err);
                    std::env::temp_dir().join("com.taghvim.calendar")
                }
            };
            let notes_mgr = Arc::new(NotesManager::new(app_data_dir));

            #[cfg(desktop)]
            notes_mgr.spawn_reminder_watcher(app.handle().clone());

            #[cfg(desktop)]
            {
                if let Err(e) = tray_icon::setup_system_tray(app.handle(), Arc::clone(&notes_mgr)) {
                    log::warn!("System tray setup skipped or failed: {:?}", e);
                } else {
                    tray_icon::refresh_tray_icon(app.handle());
                    tray_icon::spawn_midnight_watcher(app.handle().clone());
                }

                // Global shortcut Ctrl+Alt+J safely parsed
                if let Ok(shortcut) = "Ctrl+Alt+J".parse::<Shortcut>() {
                    let app_handle = app.handle().clone();
                    let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                        if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                            if let Some(w) = app_handle.get_webview_window("main") {
                                if w.is_visible().unwrap_or(false) {
                                    let _ = w.hide();
                                } else {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                    });
                }
            }

            app.manage(AppState {
                notes_manager: notes_mgr,
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            {
                if window.label() == "main" {
                    // Closing main window hides to tray instead of quitting
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                } else if window.label() == "tray-popup" {
                    // Hide tray popup automatically when it loses focus
                    if let WindowEvent::Focused(false) = event {
                        let _ = window.hide();
                    }
                }
            }
            #[cfg(not(desktop))]
            {
                let _ = (window, event);
            }
        })
        .invoke_handler({
            #[cfg(desktop)]
            {
                tauri::generate_handler![
                    get_month_events,
                    get_notes,
                    save_note,
                    delete_note,
                    get_settings,
                    save_settings,
                    convert_date,
                    minimize_window,
                    toggle_maximize_window,
                    hide_to_tray,
                    open_main_window,
                    close_app,
                ]
            }
            #[cfg(not(desktop))]
            {
                tauri::generate_handler![
                    get_month_events,
                    get_notes,
                    save_note,
                    delete_note,
                    get_settings,
                    save_settings,
                    convert_date,
                ]
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Taghvim Tauri application");
}
