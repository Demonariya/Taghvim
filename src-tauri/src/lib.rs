/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

pub mod shared;

#[cfg(target_os = "android")]
mod android;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(any(target_os = "android", target_os = "windows"))]
use std::path::PathBuf;
#[cfg(any(target_os = "android", target_os = "windows"))]
use std::sync::{Arc, OnceLock};
#[cfg(any(target_os = "android", target_os = "windows"))]
use tauri::Manager;

#[cfg(any(target_os = "android", target_os = "windows"))]
use shared::commands::{
    convert_date, delete_note, get_month_events, get_notes, get_settings,
    get_startup_diagnostics, save_note, save_settings, AppState,
};
#[cfg(any(target_os = "android", target_os = "windows"))]
use shared::diagnostics::StartupDiagnostics;
#[cfg(any(target_os = "android", target_os = "windows"))]
use shared::notes::NotesManager;

#[cfg(any(target_os = "android", target_os = "windows"))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let platform_name = if cfg!(target_os = "android") {
        "android"
    } else {
        "windows"
    };
    let diagnostics = StartupDiagnostics::new(platform_name);
    diagnostics.record_stage("rust_entry_started", Some(platform_name));

    let crash_dir = Arc::new(OnceLock::<PathBuf>::new());

    #[cfg(target_os = "android")]
    android::install_panic_hook(Arc::clone(&crash_dir), diagnostics.clone());

    #[cfg(target_os = "windows")]
    windows::install_panic_hook(Arc::clone(&crash_dir), diagnostics.clone());

    let builder = tauri::Builder::default();

    #[cfg(target_os = "android")]
    let builder = android::register_plugins(builder, &diagnostics);

    #[cfg(target_os = "windows")]
    let builder = windows::register_plugins(builder, &diagnostics);

    let setup_diagnostics = diagnostics.clone();
    let setup_crash_dir = Arc::clone(&crash_dir);

    let result = builder
        .setup(move |app| {
            setup_diagnostics.record_stage("setup_started", None);

            #[cfg(target_os = "android")]
            let app_data_dir = android::resolve_app_data_dir(app, &setup_diagnostics);

            #[cfg(target_os = "windows")]
            let app_data_dir = windows::resolve_app_data_dir(app, &setup_diagnostics);

            let notes_mgr = Arc::new(NotesManager::new(app_data_dir.clone(), &setup_diagnostics));
            setup_diagnostics.record_stage("notes_manager_initialized", None);

            #[cfg(target_os = "android")]
            android::setup(app, &app_data_dir, &setup_crash_dir, &setup_diagnostics);

            #[cfg(target_os = "windows")]
            windows::setup(
                app,
                &app_data_dir,
                &setup_crash_dir,
                &notes_mgr,
                &setup_diagnostics,
            );

            app.manage(AppState {
                notes_manager: notes_mgr,
                diagnostics: setup_diagnostics.clone(),
            });
            setup_diagnostics.record_stage("app_state_managed", None);
            setup_diagnostics.persist_snapshot();

            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(target_os = "windows")]
            windows::handle_window_event(window, event);
            #[cfg(target_os = "android")]
            let _ = (window, event);
        })
        .invoke_handler({
            #[cfg(target_os = "windows")]
            {
                tauri::generate_handler![
                    get_month_events,
                    get_notes,
                    save_note,
                    delete_note,
                    get_settings,
                    save_settings,
                    convert_date,
                    get_startup_diagnostics,
                    windows::commands::minimize_window,
                    windows::commands::toggle_maximize_window,
                    windows::commands::hide_to_tray,
                    windows::commands::open_main_window,
                    windows::commands::close_app,
                ]
            }
            #[cfg(target_os = "android")]
            {
                tauri::generate_handler![
                    get_month_events,
                    get_notes,
                    save_note,
                    delete_note,
                    get_settings,
                    save_settings,
                    convert_date,
                    get_startup_diagnostics,
                ]
            }
        })
        .run(tauri::generate_context!());

    if let Err(err) = result {
        let msg = format!("error while running Taghvim Tauri application: {:?}", err);
        diagnostics.record_error("tauri_run", &msg);
        diagnostics.persist_snapshot();
        #[cfg(target_os = "android")]
        android::logcat_write(true, &msg);
        panic!("{}", msg);
    }
}
