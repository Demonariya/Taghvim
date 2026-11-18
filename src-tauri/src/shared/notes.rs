/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::shared::diagnostics::StartupDiagnostics;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalNote {
    pub id: String,
    #[serde(alias = "jalali_year")]
    pub jalali_year: i32,
    #[serde(alias = "jalali_month")]
    pub jalali_month: u32,
    #[serde(alias = "jalali_day")]
    pub jalali_day: u32,
    pub title: String,
    pub description: String,
    #[serde(alias = "reminder_time")]
    pub reminder_time: Option<String>, // HH:mm format
    #[serde(alias = "has_reminder")]
    pub has_reminder: bool,
    #[serde(alias = "is_completed")]
    pub is_completed: bool,
    #[serde(alias = "created_at")]
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub autostart: bool,
    #[serde(alias = "first_day_of_week")]
    pub first_day_of_week: u32, // 0: شنبه, 1: یکشنبه
    #[serde(alias = "show_hijri")]
    pub show_hijri: bool,
    #[serde(alias = "show_gregorian")]
    pub show_gregorian: bool,
    #[serde(alias = "enable_notifications")]
    pub enable_notifications: bool,
    #[serde(alias = "accent_color")]
    pub accent_color: String,
    #[serde(alias = "last_cache_sync")]
    pub last_cache_sync: Option<String>,
    #[serde(alias = "offline_mode")]
    pub offline_mode: bool,
    #[serde(alias = "global_shortcut")]
    pub global_shortcut: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            autostart: true,
            first_day_of_week: 0,
            show_hijri: true,
            show_gregorian: true,
            enable_notifications: true,
            accent_color: "cyan".to_string(),
            last_cache_sync: None,
            offline_mode: false,
            global_shortcut: "Ctrl+Alt+J".to_string(),
        }
    }
}

pub struct NotesManager {
    file_path: PathBuf,
    settings_path: PathBuf,
    notes: Arc<Mutex<Vec<PersonalNote>>>,
    settings: Arc<Mutex<AppSettings>>,
}

impl NotesManager {
    pub fn new(app_data_dir: PathBuf, diagnostics: &StartupDiagnostics) -> Self {
        if let Err(err) = fs::create_dir_all(&app_data_dir) {
            diagnostics.record_warning(
                "notes_dir_create",
                &format!("Failed to create app data dir {:?}: {}", app_data_dir, err),
            );
        }

        let file_path = app_data_dir.join("personal_notes.json");
        let settings_path = app_data_dir.join("app_settings.json");

        let initial_notes = match fs::read_to_string(&file_path) {
            Ok(data) => match serde_json::from_str::<Vec<PersonalNote>>(&data) {
                Ok(parsed) => parsed,
                Err(err) => {
                    diagnostics.record_warning(
                        "notes_parse",
                        &format!("Corrupt personal_notes.json, starting empty: {}", err),
                    );
                    Vec::new()
                }
            },
            Err(_) => Vec::new(),
        };

        let initial_settings = match fs::read_to_string(&settings_path) {
            Ok(data) => match serde_json::from_str::<AppSettings>(&data) {
                Ok(parsed) => parsed,
                Err(err) => {
                    diagnostics.record_warning(
                        "settings_parse",
                        &format!("Corrupt app_settings.json, using defaults: {}", err),
                    );
                    AppSettings::default()
                }
            },
            Err(_) => AppSettings::default(),
        };

        Self {
            file_path,
            settings_path,
            notes: Arc::new(Mutex::new(initial_notes)),
            settings: Arc::new(Mutex::new(initial_settings)),
        }
    }

    pub fn get_notes(&self) -> Vec<PersonalNote> {
        self.notes.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn save_note(&self, note: PersonalNote) -> Result<Vec<PersonalNote>, String> {
        let mut list = self.notes.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(pos) = list.iter().position(|n| n.id == note.id) {
            list[pos] = note;
        } else {
            list.push(note);
        }

        let data = serde_json::to_string_pretty(&*list)
            .map_err(|e| format!("Failed to serialize notes: {}", e))?;
        fs::write(&self.file_path, data)
            .map_err(|e| format!("Failed to write notes to {:?}: {}", self.file_path, e))?;

        Ok(list.clone())
    }

    pub fn delete_note(&self, id: &str) -> Result<Vec<PersonalNote>, String> {
        let mut list = self.notes.lock().unwrap_or_else(|e| e.into_inner());
        list.retain(|n| n.id != id);

        let data = serde_json::to_string_pretty(&*list)
            .map_err(|e| format!("Failed to serialize notes: {}", e))?;
        fs::write(&self.file_path, data)
            .map_err(|e| format!("Failed to write notes to {:?}: {}", self.file_path, e))?;

        Ok(list.clone())
    }

    pub fn get_settings(&self) -> AppSettings {
        self.settings.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn save_settings(&self, settings: AppSettings) -> Result<(), String> {
        let mut curr = self.settings.lock().unwrap_or_else(|e| e.into_inner());
        *curr = settings.clone();

        let data = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        fs::write(&self.settings_path, data)
            .map_err(|e| format!("Failed to write settings to {:?}: {}", self.settings_path, e))?;

        Ok(())
    }

    pub fn notes_arc(&self) -> Arc<Mutex<Vec<PersonalNote>>> {
        Arc::clone(&self.notes)
    }

    pub fn settings_arc(&self) -> Arc<Mutex<AppSettings>> {
        Arc::clone(&self.settings)
    }
}
