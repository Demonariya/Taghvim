/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

pub mod commands;
pub mod reminders;
pub mod tray_icon;

use chrono::Utc;
use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock};
use tauri::{App, Manager, Runtime, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::shared::diagnostics::StartupDiagnostics;
use crate::shared::notes::NotesManager;

pub fn install_panic_hook(crash_dir: Arc<OnceLock<PathBuf>>, diagnostics: StartupDiagnostics) {
    let hook_diagnostics = diagnostics.clone();
    std::panic::set_hook(Box::new(move |info| {
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let location = if let Some(loc) = info.location() {
            format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
        } else {
            "unknown location".to_string()
        };

        let timestamp = Utc::now().to_rfc3339();
        let report = format!(
            "[{}] Taghvim Windows fatal crash:\nPayload: {}\nLocation: {}\n",
            timestamp, payload, location
        );
        eprintln!("{}", report);
        hook_diagnostics.record_error("rust_panic", &format!("{} at {}", payload, location));

        let temp_log = std::env::temp_dir().join("taghvim_crash.log");
        let _ = std::fs::write(&temp_log, &report);

        if let Some(dir) = crash_dir.get() {
            let _ = std::fs::create_dir_all(dir);
            let _ = std::fs::write(dir.join("crash.log"), &report);
        } else if let Some(app_data) = std::env::var_os("APPDATA") {
            let app_dir = PathBuf::from(app_data).join("com.taghvim.calendar");
            let _ = std::fs::create_dir_all(&app_dir);
            let _ = std::fs::write(app_dir.join("crash.log"), &report);
        }
    }));
    diagnostics.record_stage("panic_hook_installed", Some("Windows crash log panic hook active"));
}

pub fn register_plugins<R: Runtime>(
    mut builder: tauri::Builder<R>,
    diagnostics: &StartupDiagnostics,
) -> tauri::Builder<R> {
    let log_targets = [
        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
    ];

    builder = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets(log_targets)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init());

    diagnostics.record_stage(
        "windows_plugins_registered",
        Some("log, autostart, global-shortcut, notification"),
    );
    builder
}

pub fn resolve_app_data_dir<R: Runtime>(
    app: &App<R>,
    diagnostics: &StartupDiagnostics,
) -> PathBuf {
    match app.path().app_data_dir() {
        Ok(dir) => {
            diagnostics.record_stage("app_data_dir_resolved", Some(&dir.to_string_lossy()));
            dir
        }
        Err(err) => {
            let msg = format!("Failed to resolve app_data_dir ({:?}), using temp fallback", err);
            log::warn!("{}", msg);
            diagnostics.record_warning("app_data_dir_resolved", &msg);
            std::env::temp_dir().join("com.taghvim.calendar")
        }
    }
}

pub fn setup(
    app: &App,
    app_data_dir: &Path,
    crash_dir: &Arc<OnceLock<PathBuf>>,
    notes_mgr: &Arc<NotesManager>,
    diagnostics: &StartupDiagnostics,
) {
    let dir = app_data_dir.to_path_buf();
    let _ = crash_dir.set(dir.clone());
    diagnostics.set_app_data_dir(dir);

    reminders::spawn_reminder_watcher(
        notes_mgr.notes_arc(),
        notes_mgr.settings_arc(),
        app.handle().clone(),
    );
    diagnostics.record_stage("reminder_watcher_spawned", None);

    if let Err(e) = tray_icon::setup_system_tray(app.handle(), Arc::clone(notes_mgr)) {
        let msg = format!("System tray setup skipped or failed: {:?}", e);
        log::warn!("{}", msg);
        diagnostics.record_warning("system_tray_setup", &msg);
    } else {
        tray_icon::refresh_tray_icon(app.handle());
        tray_icon::spawn_midnight_watcher(app.handle().clone());
        diagnostics.record_stage("system_tray_setup", Some("Tray icon and midnight watcher active"));
    }

    if let Ok(shortcut) = "Ctrl+Alt+J".parse::<Shortcut>() {
        let app_handle = app.handle().clone();
        if let Err(e) = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                if let Some(w) = app_handle.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
            }
        }) {
            diagnostics.record_warning("global_shortcut", &format!("Failed to bind Ctrl+Alt+J: {:?}", e));
        } else {
            diagnostics.record_stage("global_shortcut", Some("Ctrl+Alt+J bound"));
        }
    }

    diagnostics.persist_snapshot();
}

pub fn handle_window_event<R: Runtime>(window: &tauri::Window<R>, event: &WindowEvent) {
    if window.label() == "main" {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window.hide();
        }
    } else if window.label() == "tray-popup" {
        if let WindowEvent::Focused(false) = event {
            let _ = window.hide();
        }
    }
}
