/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

pub mod shared;
mod windows;

use std::path::PathBuf;
use std::sync::{Arc, OnceLock};
use tauri::Manager;

use shared::commands::{
    convert_date, delete_note, get_month_events, get_notes, get_settings,
    get_startup_diagnostics, save_note, save_settings, AppState,
};
use shared::diagnostics::StartupDiagnostics;
use shared::notes::NotesManager;

pub fn run() {
    let diagnostics = StartupDiagnostics::new("windows");
    diagnostics.record_stage("rust_entry_started", Some("windows"));

    let crash_dir = Arc::new(OnceLock::<PathBuf>::new());
    windows::install_panic_hook(Arc::clone(&crash_dir), diagnostics.clone());

    let builder = windows::register_plugins(tauri::Builder::default(), &diagnostics);

    let setup_diagnostics = diagnostics.clone();
    let setup_crash_dir = Arc::clone(&crash_dir);

    let result = builder
        .setup(move |app| {
            setup_diagnostics.record_stage("setup_started", None);

            let app_data_dir = windows::resolve_app_data_dir(app, &setup_diagnostics);
            let notes_mgr = Arc::new(NotesManager::new(app_data_dir.clone(), &setup_diagnostics));
            setup_diagnostics.record_stage("notes_manager_initialized", None);

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
            windows::handle_window_event(window, event);
        })
        .invoke_handler(tauri::generate_handler![
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
        ])
        .run(tauri::generate_context!());

    if let Err(err) = result {
        let msg = format!("error while running Taghvim Tauri application: {:?}", err);
        diagnostics.record_error("tauri_run", &msg);
        diagnostics.persist_snapshot();
        panic!("{}", msg);
    }
}
