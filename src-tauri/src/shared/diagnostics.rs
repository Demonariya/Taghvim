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
            Ok(guard) => StartupDiagnosticsReport {
                platform: guard.platform.clone(),
                stages: guard.stages.clone(),
                errors: guard.errors.clone(),
                app_data_dir: guard
                    .app_data_dir
                    .as_ref()
                    .map(|p| p.to_string_lossy().into_owned()),
            },
            Err(_) => StartupDiagnosticsReport {
                platform: "unknown".to_string(),
                stages: Vec::new(),
                errors: vec!["Diagnostics mutex poisoned".to_string()],
                app_data_dir: None,
            },
        }
    }

    pub fn persist_snapshot(&self) {
        let report = self.report();
        let dir_opt = self
            .inner
            .lock()
            .ok()
            .and_then(|g| g.app_data_dir.clone());
        if let Some(dir) = dir_opt {
            let _ = fs::create_dir_all(&dir);
            if let Ok(json) = serde_json::to_string_pretty(&report) {
                let _ = fs::write(dir.join("startup_diagnostics.json"), json);
            }
        }
    }
}
