/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CalendarDay,
  TimeIrEvent,
  PersonalNote,
  DateConversionResult,
} from '../types/calendar.ts';
import {
  gregorianToJalali,
  jalaliToGregorian,
  jalaliToHijri,
  hijriToJalali,
  getPersianDayOfWeek,
  getDaysInJalaliMonth,
  PERSIAN_WEEK_DAYS,
  toFa,
  JALALI_MONTH_NAMES,
  GREGORIAN_MONTH_NAMES,
  HIJRI_MONTH_NAMES,
} from '../utils/persianDate.ts';

export function getStandardIranianHolidays(year: number, month: number): TimeIrEvent[] {
  const events: TimeIrEvent[] = [];

  if (month === 1) {
    events.push(
      {
        id: `${year}-1-1`,
        jalaliYear: year,
        jalaliMonth: 1,
        jalaliDay: 1,
        isHoliday: true,
        title: 'جشن نوروز / آغاز سال نو',
        source: 'time.ir',
      },
      {
        id: `${year}-1-2`,
        jalaliYear: year,
        jalaliMonth: 1,
        jalaliDay: 2,
        isHoliday: true,
        title: 'عید نوروز (روز دوم)',
        source: 'time.ir',
      },
      {
        id: `${year}-1-3`,
        jalaliYear: year,
        jalaliMonth: 1,
        jalaliDay: 3,
        isHoliday: true,
        title: 'عید نوروز (روز سوم)',
        source: 'time.ir',
      },
      {
        id: `${year}-1-4`,
        jalaliYear: year,
        jalaliMonth: 1,
        jalaliDay: 4,
        isHoliday: true,
        title: 'عید نوروز (روز چهارم)',
        source: 'time.ir',
      },
      {
        id: `${year}-1-12`,
        jalaliYear: year,
        jalaliMonth: 1,
        jalaliDay: 12,
        isHoliday: true,
        title: 'روز جمهوری اسلامی ایران',
        source: 'time.ir',
      },
      {
        id: `${year}-1-13`,
        jalaliYear: year,
        jalaliMonth: 1,
        jalaliDay: 13,
        isHoliday: true,
        title: 'روز طبیعت (سیزده‌بدر)',
        source: 'time.ir',
      }
    );
  } else if (month === 3) {
    events.push(
      {
        id: `${year}-3-14`,
        jalaliYear: year,
        jalaliMonth: 3,
        jalaliDay: 14,
        isHoliday: true,
        title: 'رحلت امام خمینی',
        source: 'time.ir',
      },
      {
        id: `${year}-3-15`,
        jalaliYear: year,
        jalaliMonth: 3,
        jalaliDay: 15,
        isHoliday: true,
        title: 'قیام ۱۵ خرداد',
        source: 'time.ir',
      }
    );
  } else if (month === 11) {
    events.push({
      id: `${year}-11-22`,
      jalaliYear: year,
      jalaliMonth: 11,
      jalaliDay: 22,
      isHoliday: true,
      title: 'پیروزی انقلاب اسلامی',
      source: 'time.ir',
    });
  } else if (month === 12) {
    events.push({
      id: `${year}-12-29`,
      jalaliYear: year,
      jalaliMonth: 12,
      jalaliDay: 29,
      isHoliday: true,
      title: 'روز ملی شدن صنعت نفت ایران',
      source: 'time.ir',
    });
  }

  return events;
}

export function buildMonthGrid(
  year: number,
  month: number,
  events: TimeIrEvent[],
  notes: PersonalNote[],
  firstDayOfWeek: 0 | 1 = 0
): CalendarDay[] {
  const daysInMonth = getDaysInJalaliMonth(year, month);
  const now = new Date();
  const [todayY, todayM, todayD] = gregorianToJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  const days: CalendarDay[] = [];
  const firstDayDow = getPersianDayOfWeek(year, month, 1);
  const leadDays = (firstDayDow - firstDayOfWeek + 7) % 7;

  if (leadDays > 0) {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevDaysCount = getDaysInJalaliMonth(prevYear, prevMonth);

    for (let i = leadDays - 1; i >= 0; i--) {
      const dayNum = prevDaysCount - i;
      const [gy, gm, gd] = jalaliToGregorian(prevYear, prevMonth, dayNum);
      const [hy, hm, hd] = jalaliToHijri(prevYear, prevMonth, dayNum);
      const dow = getPersianDayOfWeek(prevYear, prevMonth, dayNum);

      days.push({
        jalaliYear: prevYear,
        jalaliMonth: prevMonth,
        jalaliDay: dayNum,
        gregorianYear: gy,
        gregorianMonth: gm,
        gregorianDay: gd,
        hijriYear: hy,
        hijriMonth: hm,
        hijriDay: hd,
        dayOfWeek: dow,
        dayName: PERSIAN_WEEK_DAYS[dow],
        isCurrentMonth: false,
        isToday: prevYear === todayY && prevMonth === todayM && dayNum === todayD,
        isFriday: dow === 6,
        isHoliday: dow === 6,
        events: [],
        hasNotes: false,
      });
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const [gy, gm, gd] = jalaliToGregorian(year, month, d);
    const [hy, hm, hd] = jalaliToHijri(year, month, d);
    const dow = getPersianDayOfWeek(year, month, d);
    const dayEvents = events.filter((e) => e.jalaliDay === d);
    const dayNotes = notes.some(
      (n) => n.jalaliYear === year && n.jalaliMonth === month && n.jalaliDay === d
    );
    const isFri = dow === 6;
    const hasHolidayEvent = dayEvents.some((e) => e.isHoliday);

    days.push({
      jalaliYear: year,
      jalaliMonth: month,
      jalaliDay: d,
      gregorianYear: gy,
      gregorianMonth: gm,
      gregorianDay: gd,
      hijriYear: hy,
      hijriMonth: hm,
      hijriDay: hd,
      dayOfWeek: dow,
      dayName: PERSIAN_WEEK_DAYS[dow],
      isCurrentMonth: true,
      isToday: year === todayY && month === todayM && d === todayD,
      isFriday: isFri,
      isHoliday: isFri || hasHolidayEvent,
      events: dayEvents,
      hasNotes: dayNotes,
    });
  }

  const totalCells = days.length <= 35 ? 35 : 42;
  const trailingDays = totalCells - days.length;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  for (let d = 1; d <= trailingDays; d++) {
    const [gy, gm, gd] = jalaliToGregorian(nextYear, nextMonth, d);
    const [hy, hm, hd] = jalaliToHijri(nextYear, nextMonth, d);
    const dow = getPersianDayOfWeek(nextYear, nextMonth, d);

    days.push({
      jalaliYear: nextYear,
      jalaliMonth: nextMonth,
      jalaliDay: d,
      gregorianYear: gy,
      gregorianMonth: gm,
      gregorianDay: gd,
      hijriYear: hy,
      hijriMonth: hm,
      hijriDay: hd,
      dayOfWeek: dow,
      dayName: PERSIAN_WEEK_DAYS[dow],
      isCurrentMonth: false,
      isToday: nextYear === todayY && nextMonth === todayM && d === todayD,
      isFriday: dow === 6,
      isHoliday: dow === 6,
      events: [],
      hasNotes: false,
    });
  }

  return days;
}

export function convertDateThreeWay(
  sourceType: 'jalali' | 'gregorian' | 'hijri',
  year: number,
  month: number,
  day: number
): DateConversionResult {
  let jy = year;
  let jm = month;
  let jd = day;

  if (sourceType === 'gregorian') {
    [jy, jm, jd] = gregorianToJalali(year, month, day);
  } else if (sourceType === 'hijri') {
    [jy, jm, jd] = hijriToJalali(year, month, day);
  }

  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const [hy, hm, hd] = jalaliToHijri(jy, jm, jd);
  const dow = getPersianDayOfWeek(jy, jm, jd);

  return {
    jalali: {
      year: jy,
      month: jm,
      day: jd,
      formatted: `${toFa(jy)}/${toFa(jm < 10 ? '0' + jm : jm)}/${toFa(jd < 10 ? '0' + jd : jd)} (${JALALI_MONTH_NAMES[jm - 1]})`,
    },
    gregorian: {
      year: gy,
      month: gm,
      day: gd,
      formatted: `${gy}/${gm < 10 ? '0' + gm : gm}/${gd < 10 ? '0' + gd : gd} (${GREGORIAN_MONTH_NAMES[gm - 1]})`,
    },
    hijri: {
      year: hy,
      month: hm,
      day: hd,
      formatted: `${toFa(hy)}/${toFa(hm < 10 ? '0' + hm : hm)}/${toFa(hd < 10 ? '0' + hd : hd)} (${HIJRI_MONTH_NAMES[hm - 1]})`,
    },
    dayOfWeekName: PERSIAN_WEEK_DAYS[dow],
  };
}
