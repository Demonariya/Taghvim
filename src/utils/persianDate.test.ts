import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gregorianToJalali,
  jalaliToGregorian,
  jalaliToHijri,
  toFa,
  toPersianDigits,
  fromPersianDigits,
  isJalaliLeapYear,
  getDaysInJalaliMonth,
  getPersianDayOfWeek,
  PERSIAN_WEEK_DAYS,
  formatFullPersianDate,
} from './persianDate.ts';

test('Verification of 3 Aban 1405 matches 25 Oct 2026 and 13 Jumada al-Awwal 1448', () => {
  // Convert 2026-10-25 -> Jalali
  const [jy, jm, jd] = gregorianToJalali(2026, 10, 25);
  assert.equal(jy, 1405);
  assert.equal(jm, 8); // Aban
  assert.equal(jd, 3); // 3 Aban

  // Convert 1405-08-03 -> Gregorian
  const [gy, gm, gd] = jalaliToGregorian(1405, 8, 3);
  assert.equal(gy, 2026);
  assert.equal(gm, 10);
  assert.equal(gd, 25);

  // Convert 1405-08-03 -> Hijri
  const [hy, hm, hd] = jalaliToHijri(1405, 8, 3);
  assert.equal(hy, 1448);
  assert.equal(hm, 5); // Jumada al-Awwal
  assert.equal(hd, 13); // 13

  // Day of week check: Sunday -> یکشنبه (index 1)
  const dow = getPersianDayOfWeek(1405, 8, 3);
  assert.equal(dow, 1);
  assert.equal(PERSIAN_WEEK_DAYS[dow], 'یکشنبه');
});

test('Shared toFa() helper accurately transforms digits', () => {
  assert.equal(toFa(0), '۰');
  assert.equal(toFa(1405), '۱۴۰۵');
  assert.equal(toFa('Clock: 12:45:09'), 'Clock: ۱۲:۴۵:۰۹');
  assert.equal(toPersianDigits('2026/10/25'), '۲۰۲۶/۱۰/۲۵');
  assert.equal(fromPersianDigits('۱۴۰۵'), '1405');
});

test('Days in month and leap years in 33-year cycle', () => {
  assert.equal(getDaysInJalaliMonth(1403, 1), 31);
  assert.equal(getDaysInJalaliMonth(1403, 6), 31);
  assert.equal(getDaysInJalaliMonth(1403, 7), 30);
  assert.equal(getDaysInJalaliMonth(1403, 11), 30);

  // 1399 is leap, 1403 is non-leap, 1404 is leap
  assert.equal(isJalaliLeapYear(1399), true);
  assert.equal(isJalaliLeapYear(1403), false);
  assert.equal(getDaysInJalaliMonth(1403, 12), 29);
  assert.equal(isJalaliLeapYear(1404), true);
  assert.equal(getDaysInJalaliMonth(1404, 12), 30);
});

test('Full Persian date formatting for 3 Aban 1405', () => {
  const formatted = formatFullPersianDate(1405, 8, 3);
  assert.equal(formatted, 'یکشنبه، ۳ آبان ۱۴۰۵');
});
