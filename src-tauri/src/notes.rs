/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalNote {
    pub id: String,
    pub jalali_year: i32,
    pub jalali_month: u32,
    pub jalali_day: u32,
    pub title: String,
    pub description: String,
    pub reminder_time: Option<String>, // HH:mm format
    pub has_reminder: bool,
    pub is_completed: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub autostart: bool,
    pub first_day_of_week: u32, // 0: شنبه, 1: یکشنبه
    pub show_hijri: bool,
    pub show_gregorian: bool,
    pub enable_notifications: bool,
    pub accent_color: String,
    pub last_cache_sync: Option<String>,
    pub offline_mode: bool,
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
    pub fn new(app_data_dir: PathBuf) -> Self {
        let _ = fs::create_dir_all(&app_data_dir);
        let file_path = app_data_dir.join("personal_notes.json");
        let settings_path = app_data_dir.join("app_settings.json");

        // Load existing notes
        let initial_notes = if let Ok(data) = fs::read_to_string(&file_path) {
            serde_json::from_str::<Vec<PersonalNote>>(&data).unwrap_or_default()
        } else {
            Vec::new()
        };

        // Load existing settings
        let initial_settings = if let Ok(data) = fs::read_to_string(&settings_path) {
            serde_json::from_str::<AppSettings>(&data).unwrap_or_default()
        } else {
            AppSettings::default()
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

    pub fn save_note(&self, note: PersonalNote) -> Vec<PersonalNote> {
        let mut list = self.notes.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(pos) = list.iter().position(|n| n.id == note.id) {
            list[pos] = note;
        } else {
            list.push(note);
        }

        if let Ok(data) = serde_json::to_string_pretty(&*list) {
            let _ = fs::write(&self.file_path, data);
        }

        list.clone()
    }

    pub fn delete_note(&self, id: &str) -> Vec<PersonalNote> {
        let mut list = self.notes.lock().unwrap_or_else(|e| e.into_inner());
        list.retain(|n| n.id != id);

        if let Ok(data) = serde_json::to_string_pretty(&*list) {
            let _ = fs::write(&self.file_path, data);
        }

        list.clone()
    }

    pub fn get_settings(&self) -> AppSettings {
        self.settings.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn save_settings(&self, settings: AppSettings) {
        let mut curr = self.settings.lock().unwrap_or_else(|e| e.into_inner());
        *curr = settings.clone();

        if let Ok(data) = serde_json::to_string_pretty(&settings) {
            let _ = fs::write(&self.settings_path, data);
        }
    }
}

#[cfg(desktop)]
impl NotesManager {
    /// Spawns background worker checking reminders every 30 seconds and sending Windows notifications.
    pub fn spawn_reminder_watcher(&self, app_handle: tauri::AppHandle) {
        use chrono::{Datelike, Local, Timelike};
        use tauri_plugin_notification::NotificationExt;
        use crate::calendar::gregorian_to_jalali;

        let notes_arc = Arc::clone(&self.notes);
        let settings_arc = Arc::clone(&self.settings);

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
                        format!("زمان یادآوری رویداد فرا رسیده است (ساعت {})", current_time_str)
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
}
