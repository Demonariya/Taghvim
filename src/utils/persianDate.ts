/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const HIJRI_MONTH_NAMES = [
  'محرم',
  'صفر',
  'ربیع‌الاول',
  'ربیع‌الثانی',
  'جمادی‌الاول',
  'جمادی‌الثانی',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذی‌القعده',
  'ذی‌الحجه',
] as const;

export const GREGORIAN_MONTH_NAMES = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر',
] as const;

export const PERSIAN_WEEK_DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Shared helper: Converts English digits in any number or string to Persian digits (۰-۹).
 */
export function toFa(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)] ?? d);
}

// Backward-compatible alias
export const toPersianDigits = toFa;

export function fromPersianDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (ch) => {
    const idx = PERSIAN_DIGITS.indexOf(ch);
    return idx >= 0 ? String(idx) : ch;
  });
}

/**
 * Checks if a given Jalali year is a leap year (کبیسه).
 */
export function isJalaliLeapYear(jy: number): boolean {
  const base = ((jy > 0 ? jy - 474 : jy - 473) % 2820) + 474 + 38;
  return ((base * 682) % 2816) < 682;
}

/**
 * Returns the number of days in a given Jalali month.
 */
export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) return isJalaliLeapYear(jy) ? 30 : 29;
  throw new Error(`ماه نامعتبر است: ${jm}`);
}

/**
 * Convert Gregorian date to Julian Day Number (JDN).
 */
export function gregorianToJdn(gy: number, gm: number, gd: number): number {
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  return (
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Convert Julian Day Number to Gregorian date.
 */
export function jdnToGregorian(jdn: number): [number, number, number] {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const gd = e - Math.floor((153 * m + 2) / 5) + 1;
  const gm = m + 3 - 12 * Math.floor(m / 10);
  const gy = 100 * b + d - 4800 + Math.floor(m / 10);

  return [gy, gm, gd];
}

/**
 * Convert Gregorian date to Jalali (Solar Hijri).
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    (g_d_m[gm - 1] ?? 0);

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return [jy, jm, jd];
}

/**
 * Convert Jalali (Solar Hijri) to Gregorian date.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal_a = [0, 31, isLeapG ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > (sal_a[gm] ?? 0)) {
    gd -= sal_a[gm] ?? 0;
    gm++;
  }

  return [gy, gm, gd];
}

/**
 * Convert Julian Day Number to Lunar Hijri date (Islamic tabular calculation).
 */
export function jdnToHijri(jdn: number): [number, number, number] {
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const m = Math.floor((24 * l) / 709);
  const d = l - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;

  return [y, m, d];
}

/**
 * Convert Lunar Hijri date to Julian Day Number.
 */
export function hijriToJdn(hy: number, hm: number, hd: number): number {
  return (
    hd +
    Math.ceil(29.5 * (hm - 1)) +
    (hy - 1) * 354 +
    Math.floor((3 + 11 * hy) / 30) +
    1948440 -
    385
  );
}

/**
 * Convert Lunar Hijri date to Jalali date.
 */
export function hijriToJalali(hy: number, hm: number, hd: number): [number, number, number] {
  const jdn = hijriToJdn(hy, hm, hd);
  const [gy, gm, gd] = jdnToGregorian(jdn);
  return gregorianToJalali(gy, gm, gd);
}

/**
 * Convert Jalali date to Lunar Hijri date.
 */
export function jalaliToHijri(jy: number, jm: number, jd: number): [number, number, number] {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const jdn = gregorianToJdn(gy, gm, gd);
  return jdnToHijri(jdn);
}

/**
 * Computes Persian day of week:
 * 0: شنبه (Saturday)
 * 1: یکشنبه (Sunday)
 * 2: دوشنبه (Monday)
 * 3: سه‌شنبه (Tuesday)
 * 4: چهارشنبه (Wednesday)
 * 5: پنجشنبه (Thursday)
 * 6: جمعه (Friday)
 */
export function getPersianDayOfWeek(jy: number, jm: number, jd: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const gDate = new Date(gy, gm - 1, gd);
  const jsDay = gDate.getDay();
  return (jsDay + 1) % 7;
}

/**
 * Get current today's Jalali date.
 */
export function getTodayJalali(): { year: number; month: number; day: number } {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: jy, month: jm, day: jd };
}

/**
 * Formats full Persian date string, e.g. "یکشنبه، ۳ آبان ۱۴۰۵"
 */
export function formatFullPersianDate(jy: number, jm: number, jd: number): string {
  const dow = getPersianDayOfWeek(jy, jm, jd);
  const dayName = PERSIAN_WEEK_DAYS[dow];
  const monthName = JALALI_MONTH_NAMES[jm - 1] ?? '';
  return `${dayName}، ${toFa(jd)} ${monthName} ${toFa(jy)}`;
}
