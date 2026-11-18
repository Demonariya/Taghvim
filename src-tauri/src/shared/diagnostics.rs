/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use chrono::Utc;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupStage {
    pub stage: String,
    pub status: String,
    pub detail: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupDiagnosticsReport {
    pub platform: String,
    pub last_completed_stage: Option<String>,
    pub stages: Vec<StartupStage>,
    pub errors: Vec<String>,
    pub app_data_dir: Option<String>,
}

#[derive(Clone)]
pub struct StartupDiagnostics {
    inner: Arc<Mutex<DiagnosticsInner>>,
}

struct DiagnosticsInner {
    platform: String,
    stages: Vec<StartupStage>,
    errors: Vec<String>,
    app_data_dir: Option<PathBuf>,
}

fn fallback_diagnostics_dir() -> PathBuf {
    if let Some(app_data) = std::env::var_os("APPDATA") {
        PathBuf::from(app_data).join("com.taghvim.calendar")
    } else {
        std::env::temp_dir().join("com.taghvim.calendar")
    }
}

impl StartupDiagnostics {
    pub fn new(platform: &str) -> Self {
        Self {
            inner: Arc::new(Mutex::new(DiagnosticsInner {
                platform: platform.to_string(),
                stages: Vec::new(),
                errors: Vec::new(),
                app_data_dir: None,
            })),
        }
    }

    pub fn record_stage(&self, stage: &str, detail: Option<&str>) {
        let entry = StartupStage {
            stage: stage.to_string(),
            status: "ok".to_string(),
            detail: detail.map(|s| s.to_string()),
            timestamp: Utc::now().to_rfc3339(),
        };
        if let Ok(mut guard) = self.inner.lock() {
            guard.stages.push(entry);
        }
    }

    pub fn record_warning(&self, stage: &str, detail: &str) {
        let entry = StartupStage {
            stage: stage.to_string(),
            status: "warn".to_string(),
            detail: Some(detail.to_string()),
            timestamp: Utc::now().to_rfc3339(),
        };
        if let Ok(mut guard) = self.inner.lock() {
            guard.stages.push(entry);
            guard.errors.push(format!("[warn:{}] {}", stage, detail));
        }
    }

    pub fn record_error(&self, stage: &str, err: &str) {
        let entry = StartupStage {
            stage: stage.to_string(),
            status: "error".to_string(),
            detail: Some(err.to_string()),
            timestamp: Utc::now().to_rfc3339(),
        };
        if let Ok(mut guard) = self.inner.lock() {
            guard.stages.push(entry);
            guard.errors.push(format!("[error:{}] {}", stage, err));
        }
    }

    pub fn set_app_data_dir(&self, dir: PathBuf) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.app_data_dir = Some(dir);
        }
    }

    pub fn report(&self) -> StartupDiagnosticsReport {
        match self.inner.lock() {
            Ok(guard) => {
                let last_completed_stage = guard
                    .stages
                    .iter()
                    .rev()
                    .find(|s| s.status == "ok")
                    .map(|s| s.stage.clone());
                StartupDiagnosticsReport {
                    platform: guard.platform.clone(),
                    last_completed_stage,
                    stages: guard.stages.clone(),
                    errors: guard.errors.clone(),
                    app_data_dir: guard
                        .app_data_dir
                        .as_ref()
                        .map(|p| p.to_string_lossy().into_owned()),
                }
            }
            Err(_) => StartupDiagnosticsReport {
                platform: "unknown".to_string(),
                last_completed_stage: None,
                stages: Vec::new(),
                errors: vec!["Diagnostics mutex poisoned".to_string()],
                app_data_dir: None,
            },
        }
    }

    pub fn persist_snapshot(&self) {
        let report = self.report();
        let target_dir = self
            .inner
            .lock()
            .ok()
            .and_then(|g| g.app_data_dir.clone())
            .unwrap_or_else(fallback_diagnostics_dir);

        if let Ok(json) = serde_json::to_string_pretty(&report) {
            let _ = fs::create_dir_all(&target_dir);
            if fs::write(target_dir.join("startup_diagnostics.json"), &json).is_err() {
                let temp_path = std::env::temp_dir().join("taghvim_startup_diagnostics.json");
                let _ = fs::write(temp_path, &json);
            }
        }
    }
}
