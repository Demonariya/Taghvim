/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CalendarDay,
  TimeIrEvent,
  PersonalNote,
  AppSettings,
  DateConversionResult,
} from '../types/calendar.ts';
import { isAndroid } from '../platform.ts';
import {
  gregorianToJalali,
  jalaliToGregorian,
  jalaliToHijri,
  getPersianDayOfWeek,
  getDaysInJalaliMonth,
  PERSIAN_WEEK_DAYS,
  toFa,
  JALALI_MONTH_NAMES,
  GREGORIAN_MONTH_NAMES,
  HIJRI_MONTH_NAMES,
} from '../utils/persianDate.ts';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autostart: true,
  firstDayOfWeek: 0,
  showHijri: true,
  showGregorian: true,
  enableNotifications: true,
  accentColor: 'cyan',
  lastCacheSync: new Date().toISOString(),
  offlineMode: false,
  globalShortcut: 'Ctrl+Alt+J',
  lastError: undefined,
};

const STORAGE_KEYS = {
  SETTINGS: 'taghvim_settings',
  NOTES: 'taghvim_notes',
  EVENTS_CACHE_PREFIX: 'taghvim_events_',
};

async function callTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (err) {
      console.warn(`[Tauri] Invoke error for command "${cmd}":`, err);
      throw err;
    }
  }
  throw new Error('Not in Tauri environment');
}

export async function getMonthEvents(
  year: number,
  month: number,
  forceRefresh = false
): Promise<{ events: TimeIrEvent[]; isOffline: boolean; cachedAt?: string; lastError?: string }> {
  if (isTauri()) {
    try {
      return await callTauri<{
        events: TimeIrEvent[];
        is_offline: boolean;
        cached_at?: string;
        last_error?: string;
      }>('get_month_events', { year, month, forceRefresh }).then((res) => ({
        events: res.events,
        isOffline: res.is_offline,
        cachedAt: res.cached_at,
        lastError: res.last_error,
      }));
    } catch (err) {
      console.warn('[Tauri] Fallback to local offline calc:', err);
    }
  }

  // Web Browser fallback simulation
  const cacheKey = `${STORAGE_KEYS.EVENTS_CACHE_PREFIX}${year}_${month}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached && !forceRefresh) {
    try {
      const parsed = JSON.parse(cached);
      return {
        events: parsed.events,
        isOffline: parsed.isOffline ?? false,
        cachedAt: parsed.cachedAt,
        lastError: parsed.lastError,
      };
    } catch {
      // ignore parse error
    }
  }

  const events: TimeIrEvent[] = getStandardIranianHolidays(year, month);
  const result = {
    events,
    isOffline: false,
    cachedAt: new Date().toISOString(),
    lastError: undefined,
  };

  localStorage.setItem(cacheKey, JSON.stringify(result));
  return result;
}

function getStandardIranianHolidays(year: number, month: number): TimeIrEvent[] {
  const events: TimeIrEvent[] = [];

  if (month === 1) {
    events.push({
      id: `${year}-1-1`,
      jalaliYear: year,
      jalaliMonth: 1,
      jalaliDay: 1,
      isHoliday: true,
      title: 'جشن نوروز / آغاز سال نو',
      source: 'time.ir',
    });
    events.push({
      id: `${year}-1-2`,
      jalaliYear: year,
      jalaliMonth: 1,
      jalaliDay: 2,
      isHoliday: true,
      title: 'عید نوروز (روز دوم)',
      source: 'time.ir',
    });
    events.push({
      id: `${year}-1-3`,
      jalaliYear: year,
      jalaliMonth: 1,
      jalaliDay: 3,
      isHoliday: true,
      title: 'عید نوروز (روز سوم)',
      source: 'time.ir',
    });
    events.push({
      id: `${year}-1-4`,
      jalaliYear: year,
      jalaliMonth: 1,
      jalaliDay: 4,
      isHoliday: true,
      title: 'عید نوروز (روز چهارم)',
      source: 'time.ir',
    });
    events.push({
      id: `${year}-1-12`,
      jalaliYear: year,
      jalaliMonth: 1,
      jalaliDay: 12,
      isHoliday: true,
      title: 'روز جمهوری اسلامی ایران',
      source: 'time.ir',
    });
    events.push({
      id: `${year}-1-13`,
      jalaliYear: year,
      jalaliMonth: 1,
      jalaliDay: 13,
      isHoliday: true,
      title: 'روز طبیعت (سیزده‌بدر)',
      source: 'time.ir',
    });
  } else if (month === 3) {
    events.push({
      id: `${year}-3-14`,
      jalaliYear: year,
      jalaliMonth: 3,
      jalaliDay: 14,
      isHoliday: true,
      title: 'رحلت امام خمینی',
      source: 'time.ir',
    });
    events.push({
      id: `${year}-3-15`,
      jalaliYear: year,
      jalaliMonth: 3,
      jalaliDay: 15,
      isHoliday: true,
      title: 'قیام ۱۵ خرداد',
      source: 'time.ir',
    });
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
  let leadDays = (firstDayDow - firstDayOfWeek + 7) % 7;

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

export async function getNotes(): Promise<PersonalNote[]> {
  if (isTauri()) {
    try {
      return await callTauri<PersonalNote[]>('get_notes');
    } catch (err) {
      console.warn('[Tauri] Fallback to local notes:', err);
    }
  }

  const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveNote(note: PersonalNote): Promise<PersonalNote[]> {
  if (note.hasReminder && isAndroid && isTauri()) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
      let granted = await isPermissionGranted();
      if (!granted) {
        const perm = await requestPermission();
        granted = perm === 'granted';
      }
    } catch (err) {
      console.warn('[Android] Notification permission request error:', err);
    }
  }

  if (isTauri()) {
    try {
      return await callTauri<PersonalNote[]>('save_note', { note });
    } catch (err) {
      console.warn('[Tauri] Fallback save note:', err);
    }
  }

  const notes = await getNotes();
  const existingIdx = notes.findIndex((n) => n.id === note.id);
  if (existingIdx >= 0) {
    notes[existingIdx] = note;
  } else {
    notes.push(note);
  }
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  return notes;
}

export async function deleteNote(id: string): Promise<PersonalNote[]> {
  if (isTauri()) {
    try {
      return await callTauri<PersonalNote[]>('delete_note', { id });
    } catch (err) {
      console.warn('[Tauri] Fallback delete note:', err);
    }
  }

  const notes = await getNotes();
  const filtered = notes.filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(filtered));
  return filtered;
}

export async function getSettings(): Promise<AppSettings> {
  if (isTauri()) {
    try {
      return await callTauri<AppSettings>('get_settings');
    } catch (err) {
      console.warn('[Tauri] Fallback to local settings:', err);
    }
  }

  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isTauri()) {
    try {
      await callTauri('save_settings', { settings });
    } catch (err) {
      console.warn('[Tauri] Fallback save settings:', err);
    }
  }

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
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
    const [gy, gm, gd] = jalaliToGregorian(1400, 1, 1);
    const result = gregorianToJalali(gy, gm, gd);
    jy = result[0];
    jm = result[1];
    jd = result[2];
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

// Window control functions
export async function minimizeWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await callTauri('minimize_window');
      return;
    } catch {
      // fallback
    }
  }
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await callTauri('toggle_maximize_window');
      return;
    } catch {
      // fallback
    }
  }
}

export async function hideToTray(): Promise<void> {
  if (isTauri()) {
    try {
      await callTauri('hide_to_tray');
      return;
    } catch {
      // fallback
    }
  }
}

export async function openMainWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await callTauri('open_main_window');
      return;
    } catch {
      // fallback
    }
  }
  if (typeof window !== 'undefined') {
    window.location.hash = '';
  }
}

export async function sendNotification(title: string, body: string): Promise<void> {
  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification: tauriNotify } = await import(
        '@tauri-apps/plugin-notification'
      );
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        tauriNotify({ title, body });
        return;
      }
    } catch (err) {
      console.warn('[Notification] Tauri notification plugin error:', err);
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}
