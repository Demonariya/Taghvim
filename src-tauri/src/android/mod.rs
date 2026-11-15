/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use chrono::Utc;
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock};
use tauri::{App, Manager, Runtime};

use crate::shared::diagnostics::StartupDiagnostics;

const ANDROID_LOG_INFO: c_int = 4;
const ANDROID_LOG_ERROR: c_int = 6;
const LOGCAT_TAG: &[u8] = b"TaghvimRust\0";

#[link(name = "log")]
extern "C" {
    fn __android_log_write(prio: c_int, tag: *const c_char, text: *const c_char) -> c_int;
}

pub fn logcat_write(is_error: bool, message: &str) {
    let sanitized = message.replace('\0', " ");
    if let Ok(c_msg) = CString::new(sanitized) {
        let prio = if is_error {
            ANDROID_LOG_ERROR
        } else {
            ANDROID_LOG_INFO
        };
        // SAFETY: LOGCAT_TAG is NUL-terminated static bytes and c_msg is a valid CString.
        unsafe {
            __android_log_write(prio, LOGCAT_TAG.as_ptr().cast::<c_char>(), c_msg.as_ptr());
        }
    }
}

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
            "[{}] Taghvim Android fatal panic:\nPayload: {}\nLocation: {}\n",
            timestamp, payload, location
        );

        logcat_write(true, &report);
        hook_diagnostics.record_error("rust_panic", &format!("{} at {}", payload, location));

        if let Some(dir) = crash_dir.get() {
            let _ = std::fs::create_dir_all(dir);
            let _ = std::fs::write(dir.join("android_rust_crash.log"), &report);
            hook_diagnostics.persist_snapshot();
        }
    }));
    logcat_write(false, "stage:panic_hook_installed");
    diagnostics.record_stage("panic_hook_installed", Some("Android logcat panic hook active"));
}

pub fn register_plugins<R: Runtime>(
    mut builder: tauri::Builder<R>,
    diagnostics: &StartupDiagnostics,
) -> tauri::Builder<R> {
    let log_targets = [
        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
    ];

    builder = builder.plugin(
        tauri_plugin_log::Builder::new()
            .targets(log_targets)
            .build(),
    );
    logcat_write(false, "stage:log_plugin_registered");
    diagnostics.record_stage("log_plugin_registered", Some("Stdout + Webview targets"));

    builder = builder.plugin(tauri_plugin_notification::init());
    logcat_write(false, "stage:notification_plugin_registered");
    diagnostics.record_stage("notification_plugin_registered", Some("Android notification plugin"));

    builder
}

pub fn resolve_app_data_dir<R: Runtime>(
    app: &App<R>,
    diagnostics: &StartupDiagnostics,
) -> PathBuf {
    match app.path().app_data_dir() {
        Ok(dir) => {
            logcat_write(false, &format!("stage:app_data_dir_resolved path={:?}", dir));
            diagnostics.record_stage("app_data_dir_resolved", Some(&dir.to_string_lossy()));
            dir
        }
        Err(err) => {
            let msg = format!("app_data_dir failed ({:?}); attempting app_cache_dir", err);
            logcat_write(true, &msg);
            diagnostics.record_warning("app_data_dir_resolved", &msg);

            match app.path().app_cache_dir() {
                Ok(cache_dir) => {
                    let fallback = cache_dir.join("taghvim_data");
                    logcat_write(false, &format!("Using cache fallback path={:?}", fallback));
                    fallback
                }
                Err(cache_err) => {
                    let fallback = std::env::temp_dir().join("com.taghvim.calendar");
                    diagnostics.record_warning(
                        "app_cache_dir_fallback",
                        &format!("app_cache_dir also failed ({:?}); using temp_dir", cache_err),
                    );
                    fallback
                }
            }
        }
    }
}

pub fn setup<R: Runtime>(
    _app: &App<R>,
    app_data_dir: &Path,
    crash_dir: &Arc<OnceLock<PathBuf>>,
    diagnostics: &StartupDiagnostics,
) {
    let dir = app_data_dir.to_path_buf();
    let _ = crash_dir.set(dir.clone());
    diagnostics.set_app_data_dir(dir);
    diagnostics.record_stage("android_setup_complete", Some("Android runtime initialized cleanly"));
    diagnostics.persist_snapshot();
    logcat_write(false, "stage:android_setup_complete");
}
