#![cfg(desktop)]

/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use chrono::Timelike;
use std::sync::{Arc, OnceLock};
use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, WebviewWindowBuilder,
};

use crate::calendar::{format_full_persian_date, get_today_jalali};
use crate::notes::NotesManager;

static DIGIKALA_FONT: OnceLock<Option<fontdue::Font>> = OnceLock::new();

/// Returns the embedded "Digikala New" font loaded from `src/assets/fonts/digikala.ttf`.
/// Never loads any system font.
fn get_font() -> Option<&'static fontdue::Font> {
    DIGIKALA_FONT
        .get_or_init(|| {
            let font_bytes = include_bytes!("../../src/assets/fonts/digikala.ttf");
            fontdue::Font::from_bytes(font_bytes as &[u8], fontdue::FontSettings::default()).ok()
        })
        .as_ref()
}

/// Converts day number (1..=31) to Persian digits in visual left-to-right order (tens digit first).
fn day_to_persian_digits(day: u32) -> Vec<char> {
    const PERSIAN_DIGITS: [char; 10] = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let d = day.clamp(1, 31);
    if d < 10 {
        vec![PERSIAN_DIGITS[d as usize]]
    } else {
        vec![
            PERSIAN_DIGITS[(d / 10) as usize],
            PERSIAN_DIGITS[(d % 10) as usize],
        ]
    }
}

/// Renders a dynamic 64x64 RGBA day icon in memory using `fontdue`.
/// Rounded square (radius 12), background #14171f, 2px border in accent color, white antialiased text.
pub fn render_day_icon(day: u32, accent: [u8; 3]) -> Image<'static> {
    let bg_r = 0x14u8; // 20 (#14171f)
    let bg_g = 0x17u8; // 23
    let bg_b = 0x1fu8; // 31

    let border_r = accent[0];
    let border_g = accent[1];
    let border_b = accent[2];

    let mut rgba = vec![0u8; 64 * 64 * 4];

    let radius = 12.0f32;
    let border_width = 2.0f32;

    // 1. Draw rounded box with 2px border and #14171f background
    for y in 0..64 {
        for x in 0..64 {
            let px = x as f32 + 0.5;
            let py = y as f32 + 0.5;

            let dx = (px - 32.0).abs();
            let dy = (py - 32.0).abs();

            let qx = dx - (32.0 - radius);
            let qy = dy - (32.0 - radius);

            let dist = if qx > 0.0 && qy > 0.0 {
                (qx * qx + qy * qy).sqrt() - radius
            } else {
                qx.max(qy) - radius
            };

            let idx = (y * 64 + x) * 4;

            if dist > 0.0 {
                // Outside rounded corners: transparent
                rgba[idx] = 0;
                rgba[idx + 1] = 0;
                rgba[idx + 2] = 0;
                rgba[idx + 3] = 0;
            } else if dist >= -border_width {
                // 2px border in accent color
                rgba[idx] = border_r;
                rgba[idx + 1] = border_g;
                rgba[idx + 2] = border_b;
                rgba[idx + 3] = 255;
            } else {
                // Interior fill #14171f
                rgba[idx] = bg_r;
                rgba[idx + 1] = bg_g;
                rgba[idx + 2] = bg_b;
                rgba[idx + 3] = 255;
            }
        }
    }

    // 2. Rasterize Persian digits using fontdue if font is available
    if let Some(font) = get_font() {
        let chars = day_to_persian_digits(day);
        let font_size = if chars.len() == 1 { 40.0f32 } else { 32.0f32 };

        let (ascent, descent) = if let Some(lm) = font.horizontal_line_metrics(font_size) {
            (lm.ascent, lm.descent)
        } else {
            (font_size * 0.8, -font_size * 0.2)
        };

        // Baseline calculation from horizontal_line_metrics to center vertically at 32.0
        let baseline = 32.0 + (ascent + descent) / 2.0;

        let mut rasterized = Vec::with_capacity(chars.len());
        let mut total_advance = 0.0f32;

        for &ch in &chars {
            let (metrics, bitmap) = font.rasterize(ch, font_size);
            total_advance += metrics.advance_width;
            rasterized.push((metrics, bitmap));
        }

        // Center horizontally
        let start_x = (64.0 - total_advance) / 2.0;

        // 3. Alpha-blend coverage bitmap into RGBA buffer (white text, standard premultiplication)
        let mut curr_x = start_x;
    for (metrics, bitmap) in rasterized {
        let glyph_left = (curr_x + metrics.xmin as f32).round() as i32;
        let glyph_top = (baseline - (metrics.ymin + metrics.height as i32) as f32).round() as i32;

        for row in 0..metrics.height {
            for col in 0..metrics.width {
                let cov = bitmap[row * metrics.width + col];
                if cov == 0 {
                    continue;
                }

                let px = glyph_left + col as i32;
                let py = glyph_top + row as i32;

                if px >= 0 && px < 64 && py >= 0 && py < 64 {
                    let idx = ((py as usize) * 64 + (px as usize)) * 4;
                    let src_a = cov as f32 / 255.0;

                    let dst_r = rgba[idx] as f32;
                    let dst_g = rgba[idx + 1] as f32;
                    let dst_b = rgba[idx + 2] as f32;
                    let dst_a = rgba[idx + 3] as f32 / 255.0;

                    // Source is pure white [255.0, 255.0, 255.0]
                    let out_a = src_a + dst_a * (1.0 - src_a);
                    if out_a > 0.0 {
                        let out_r = (255.0 * src_a + dst_r * dst_a * (1.0 - src_a)) / out_a;
                        let out_g = (255.0 * src_a + dst_g * dst_a * (1.0 - src_a)) / out_a;
                        let out_b = (255.0 * src_a + dst_b * dst_a * (1.0 - src_a)) / out_a;

                        rgba[idx] = out_r.round().clamp(0.0, 255.0) as u8;
                        rgba[idx + 1] = out_g.round().clamp(0.0, 255.0) as u8;
                        rgba[idx + 2] = out_b.round().clamp(0.0, 255.0) as u8;
                        rgba[idx + 3] = (out_a * 255.0).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
        }
        curr_x += metrics.advance_width;
    }
    }

    Image::new_owned(rgba, 64, 64)
}

/// Refreshes the tray icon with today's day number and the tooltip with the full Jalali date.
pub fn refresh_tray_icon(app: &AppHandle) {
    let (jy, jm, jd) = get_today_jalali();
    let img = render_day_icon(jd, [34, 211, 238]);
    let tooltip = format!("تقویم: {}", format_full_persian_date(jy, jm, jd));

    if let Some(tray) = app.tray_by_id("taghvim_tray") {
        let _ = tray.set_icon(Some(img));
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

/// Spawns a background task that sleeps until local midnight and updates the tray icon.
pub fn spawn_midnight_watcher(app: AppHandle) {
    tokio::spawn(async move {
        let mut last_day = get_today_jalali().2;
        loop {
            let now = chrono::Local::now();
            let elapsed_today = (now.hour() * 3600 + now.minute() * 60 + now.second()) as u64;
            let seconds_to_midnight = 86400u64.saturating_sub(elapsed_today);
            let sleep_secs = seconds_to_midnight.max(1);

            tokio::time::sleep(tokio::time::Duration::from_secs(sleep_secs + 1)).await;

            let current_day = get_today_jalali().2;
            if current_day != last_day {
                refresh_tray_icon(&app);
                last_day = current_day;
            }
        }
    });
}

pub struct TrayState(pub tauri::tray::TrayIcon);

/// Configures the native Windows system tray icon and menus.
pub fn setup_system_tray(app: &AppHandle, notes_mgr: Arc<NotesManager>) -> Result<(), Box<dyn std::error::Error>> {
    let (jy, jm, jd) = get_today_jalali();
    let initial_icon = render_day_icon(jd, [34, 211, 238]);
    let initial_tooltip = format!("تقویم: {}", format_full_persian_date(jy, jm, jd));

    let settings = notes_mgr.get_settings();

    let today_item = MenuItemBuilder::with_id("today", "امروز").build(app)?;
    let open_main_item = MenuItemBuilder::with_id("open_main", "باز کردن پنجره اصلی").build(app)?;
    let autostart_item = CheckMenuItemBuilder::with_id("autostart", "شروع با ویندوز")
        .checked(settings.autostart)
        .build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "خروج").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&today_item, &open_main_item, &autostart_item, &quit_item])
        .build()?;

    let mut builder = TrayIconBuilder::with_id("taghvim_tray")
        .icon(initial_icon)
        .tooltip(initial_tooltip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app_h, event| match event.id.as_ref() {
            "today" => {
                if let Some(w) = app_h.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                    let _ = w.eval("window.dispatchEvent(new CustomEvent('taghvim-jump-today'))");
                }
            }
            "open_main" => {
                if let Some(w) = app_h.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "autostart" => {
                let mut s = notes_mgr.get_settings();
                s.autostart = !s.autostart;
                notes_mgr.save_settings(s);
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                position,
                ..
            } = event
            {
                let app = tray.app_handle();
                let popup = if let Some(p) = app.get_webview_window("tray-popup") {
                    Some(p)
                } else {
                    WebviewWindowBuilder::new(
                        app,
                        "tray-popup",
                        tauri::WebviewUrl::App("index.html#/tray".into()),
                    )
                    .title("تقویم")
                    .inner_size(360.0, 520.0)
                    .resizable(false)
                    .decorations(false)
                    .always_on_top(true)
                    .visible(false)
                    .skip_taskbar(true)
                    .build()
                    .ok()
                };

                if let Some(popup) = popup {
                    if popup.is_visible().unwrap_or(false) {
                        let _ = popup.hide();
                    } else {
                        let x = (position.x as i32 - 180).max(10);
                        let y = (position.y as i32 - 530).max(10);
                        let _ = popup.set_position(tauri::Position::Physical(PhysicalPosition { x, y }));
                        let _ = popup.show();
                        let _ = popup.set_focus();
                    }
                }
            }
        });

    let tray = match builder.build(app) {
        Ok(t) => t,
        Err(e) => {
            log::warn!("Tray build with custom icon failed: {:?}, falling back to default", e);
            if let Some(default_icon) = app.default_window_icon() {
                TrayIconBuilder::with_id("taghvim_tray")
                    .icon(default_icon.clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .build(app)?
            } else {
                return Err(e.into());
            }
        }
    };

    app.manage(TrayState(tray));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_day_icon_persian_digits() {
        let accent = [34u8, 211u8, 238u8];
        let test_days = [1, 9, 10, 25, 31];

        for &day in &test_days {
            let img = render_day_icon(day, accent);
            let raw = img.rgba();
            assert_eq!(
                raw.len(),
                64 * 64 * 4,
                "Buffer length must be 64*64*4 for day {}",
                day
            );

            // Background color is #14171f (20, 23, 31, 255)
            let mut non_bg_count = 0;
            let mut white_glyph_pixel_count = 0;
            for chunk in raw.chunks_exact(4) {
                let is_bg = chunk[0] == 20 && chunk[1] == 23 && chunk[2] == 31 && chunk[3] == 255;
                if !is_bg {
                    non_bg_count += 1;
                }
                if chunk[0] >= 180 && chunk[1] >= 180 && chunk[2] >= 180 {
                    white_glyph_pixel_count += 1;
                }
            }

            let non_bg_pct = (non_bg_count as f64) / (64.0 * 64.0) * 100.0;
            assert!(
                non_bg_pct >= 5.0,
                "Day {} rendered only {:.2}% non-background pixels, expected >= 5%",
                day,
                non_bg_pct
            );
            assert!(
                white_glyph_pixel_count > 0,
                "Day {} rendered 0 white glyph pixels, missing glyph detected!",
                day
            );
        }
    }
}
