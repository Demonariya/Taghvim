#![allow(dead_code)]

/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

use chrono::{Datelike, Local, NaiveDate};
use serde::{Deserialize, Serialize};

#[allow(dead_code)]
pub const JALALI_MONTH_NAMES: [&str; 12] = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

pub const PERSIAN_WEEK_DAYS: [&str; 7] = [
    "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeIrEvent {
    pub id: String,
    pub jalali_year: i32,
    pub jalali_month: u32,
    pub jalali_day: u32,
    pub is_holiday: bool,
    pub title: String,
    pub description: Option<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateConversionResponse {
    pub jalali: DatePart,
    pub gregorian: DatePart,
    pub hijri: DatePart,
    pub day_of_week_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatePart {
    pub year: i32,
    pub month: u32,
    pub day: u32,
    pub formatted: String,
}

/// Check if a Jalali year is a leap year (33-year cycle).
#[allow(dead_code)]
pub fn is_jalali_leap_year(jy: i32) -> bool {
    let base = ((if jy > 0 { jy - 474 } else { jy - 473 }) % 2820) + 474 + 38;
    ((base * 682) % 2816) < 682
}

/// Returns days in a Jalali month (1..12).
#[allow(dead_code)]
pub fn get_days_in_jalali_month(jy: i32, jm: u32) -> u32 {
    match jm {
        1..=6 => 31,
        7..=11 => 30,
        12 => if is_jalali_leap_year(jy) { 30 } else { 29 },
        _ => 30,
    }
}

/// Converts Gregorian to Jalali (Solar Hijri).
pub fn gregorian_to_jalali(gy: i32, gm: u32, gd: u32) -> (i32, u32, u32) {
    let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = if gm > 2 { gy + 1 } else { gy };
    let mut days = 355666
        + 365 * gy
        + ((gy2 + 3) / 4)
        - ((gy2 + 99) / 100)
        + ((gy2 + 399) / 400)
        + (gd as i32)
        + g_d_m[(gm - 1) as usize];

    let mut jy = -1595 + 33 * (days / 12053);
    days %= 12053;
    jy += 4 * (days / 1461);
    days %= 1461;

    if days > 365 {
        jy += (days - 1) / 365;
        days = (days - 1) % 365;
    }

    let (jm, jd) = if days < 186 {
        (1 + (days / 31) as u32, 1 + (days % 31) as u32)
    } else {
        (7 + ((days - 186) / 30) as u32, 1 + ((days - 186) % 30) as u32)
    };

    (jy, jm, jd)
}

/// Converts Jalali to Gregorian.
pub fn jalali_to_gregorian(mut jy: i32, jm: u32, jd: u32) -> (i32, u32, u32) {
    jy += 1595;
    let mut days = -355668
        + 365 * jy
        + (jy / 33) * 8
        + ((jy % 33) + 3) / 4
        + (jd as i32)
        + if jm < 7 {
            ((jm - 1) * 31) as i32
        } else {
            (((jm - 7) * 30) + 186) as i32
        };

    let mut gy = 400 * (days / 146097);
    days %= 146097;

    if days > 36524 {
        days -= 1;
        gy += 100 * (days / 36524);
        days %= 36524;
        if days >= 365 {
            days += 1;
        }
    }

    gy += 4 * (days / 1461);
    days %= 1461;

    if days > 365 {
        gy += (days - 1) / 365;
        days = (days - 1) % 365;
    }

    let mut gd = days + 1;
    let is_leap_g = (gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0);
    let sal_a = [0, 31, if is_leap_g { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut gm = 0;
    while gm < 13 && gd > sal_a[gm] {
        gd -= sal_a[gm];
        gm += 1;
    }

    (gy, gm as u32, gd as u32)
}

/// Converts Gregorian to Julian Day Number (JDN).
pub fn gregorian_to_jdn(gy: i32, gm: u32, gd: u32) -> i64 {
    let a = ((14 - gm as i64) / 12) as i64;
    let y = gy as i64 + 4800 - a;
    let m = gm as i64 + 12 * a - 3;
    (gd as i64) + ((153 * m + 2) / 5) + 365 * y + (y / 4) - (y / 100) + (y / 400) - 32045
}

/// Converts Julian Day Number to Lunar Hijri (Islamic tabular).
pub fn jdn_to_hijri(jdn: i64) -> (i32, u32, u32) {
    let mut l = jdn - 1948440 + 10632;
    let n = (l - 1) / 10631;
    l = l - 10631 * n + 354;
    let j = ((10985 - l) / 5316) * ((50 * l) / 17719) + (l / 5670) * ((43 * l) / 15238);
    l = l - ((30 - j) / 15) * ((17719 * j) / 50) - (j / 16) * ((15238 * j) / 43) + 29;
    let m = (24 * l) / 709;
    let d = l - (709 * m) / 24;
    let y = 30 * n + j - 30;
    (y as i32, m as u32, d as u32)
}

/// Converts Jalali to Lunar Hijri.
pub fn jalali_to_hijri(jy: i32, jm: u32, jd: u32) -> (i32, u32, u32) {
    let (gy, gm, gd) = jalali_to_gregorian(jy, jm, jd);
    let jdn = gregorian_to_jdn(gy, gm, gd);
    jdn_to_hijri(jdn)
}

/// Returns Persian day of week (0: شنبه, ..., 6: جمعه).
pub fn get_persian_day_of_week(jy: i32, jm: u32, jd: u32) -> usize {
    let (gy, gm, gd) = jalali_to_gregorian(jy, jm, jd);
    if let Some(date) = NaiveDate::from_ymd_opt(gy, gm, gd) {
        // Chrono: Monday is 0, Sunday is 6
        // We want: Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6
        let chrono_dow = date.weekday().num_days_from_monday(); // 0..6
        match chrono_dow {
            0 => 2, // دوشنبه
            1 => 3, // سه‌شنبه
            2 => 4, // چهارشنبه
            3 => 5, // پنجشنبه
            4 => 6, // جمعه
            5 => 0, // شنبه
            6 => 1, // یکشنبه
            _ => 0,
        }
    } else {
        0
    }
}

/// Converts ASCII digits to Persian digits.
pub fn to_persian_digits(value: impl std::fmt::Display) -> String {
    let s = value.to_string();
    s.chars()
        .map(|c| match c {
            '0' => '۰',
            '1' => '۱',
            '2' => '۲',
            '3' => '۳',
            '4' => '۴',
            '5' => '۵',
            '6' => '۶',
            '7' => '۷',
            '8' => '۸',
            '9' => '۹',
            other => other,
        })
        .collect()
}

/// Formats full Persian date: "یکشنبه، ۵ آبان ۱۴۰۵"
#[allow(dead_code)]
pub fn format_full_persian_date(jy: i32, jm: u32, jd: u32) -> String {
    let dow = get_persian_day_of_week(jy, jm, jd);
    let day_name = PERSIAN_WEEK_DAYS[dow];
    let month_name = JALALI_MONTH_NAMES.get((jm.saturating_sub(1)) as usize).unwrap_or(&"");
    format!(
        "{}، {} {} {}",
        day_name,
        to_persian_digits(jd),
        month_name,
        to_persian_digits(jy)
    )
}

/// Returns today's Jalali date from local system clock.
#[allow(dead_code)]
pub fn get_today_jalali() -> (i32, u32, u32) {
    let now = Local::now();
    gregorian_to_jalali(now.year(), now.month(), now.day())
}

/// Standard fixed national statutory holidays in Iran for offline computation.
pub fn get_standard_fallback_holidays(year: i32, month: u32) -> Vec<TimeIrEvent> {
    let mut events = Vec::new();

    if month == 1 {
        events.push(TimeIrEvent {
            id: format!("{}-1-1", year),
            jalali_year: year,
            jalali_month: 1,
            jalali_day: 1,
            is_holiday: true,
            title: "جشن نوروز / آغاز سال نو".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
        events.push(TimeIrEvent {
            id: format!("{}-1-2", year),
            jalali_year: year,
            jalali_month: 1,
            jalali_day: 2,
            is_holiday: true,
            title: "عید نوروز (روز دوم)".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
        events.push(TimeIrEvent {
            id: format!("{}-1-3", year),
            jalali_year: year,
            jalali_month: 1,
            jalali_day: 3,
            is_holiday: true,
            title: "عید نوروز (روز سوم)".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
        events.push(TimeIrEvent {
            id: format!("{}-1-4", year),
            jalali_year: year,
            jalali_month: 1,
            jalali_day: 4,
            is_holiday: true,
            title: "عید نوروز (روز چهارم)".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
        events.push(TimeIrEvent {
            id: format!("{}-1-12", year),
            jalali_year: year,
            jalali_month: 1,
            jalali_day: 12,
            is_holiday: true,
            title: "روز جمهوری اسلامی ایران".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
        events.push(TimeIrEvent {
            id: format!("{}-1-13", year),
            jalali_year: year,
            jalali_month: 1,
            jalali_day: 13,
            is_holiday: true,
            title: "روز طبیعت (سیزده‌بدر)".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
    } else if month == 3 {
        events.push(TimeIrEvent {
            id: format!("{}-3-14", year),
            jalali_year: year,
            jalali_month: 3,
            jalali_day: 14,
            is_holiday: true,
            title: "رحلت امام خمینی".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
        events.push(TimeIrEvent {
            id: format!("{}-3-15", year),
            jalali_year: year,
            jalali_month: 3,
            jalali_day: 15,
            is_holiday: true,
            title: "قیام ۱۵ خرداد".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
    } else if month == 11 {
        events.push(TimeIrEvent {
            id: format!("{}-11-22", year),
            jalali_year: year,
            jalali_month: 11,
            jalali_day: 22,
            is_holiday: true,
            title: "پیروزی انقلاب اسلامی".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
    } else if month == 12 {
        events.push(TimeIrEvent {
            id: format!("{}-12-29", year),
            jalali_year: year,
            jalali_month: 12,
            jalali_day: 29,
            is_holiday: true,
            title: "روز ملی شدن صنعت نفت ایران".to_string(),
            description: None,
            source: "offline_calc".to_string(),
        });
    }

    events
}
