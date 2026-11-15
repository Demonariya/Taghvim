/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TimeIrEvent,
  PersonalNote,
  AppSettings,
} from '../types/calendar.ts';
import { getStandardIranianHolidays } from './calendarGrid.ts';

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
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
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
      const res = await callTauri<{
        events: TimeIrEvent[];
        isOffline?: boolean;
        is_offline?: boolean;
        cachedAt?: string;
        cached_at?: string;
        lastError?: string;
        last_error?: string;
      }>('get_month_events', { year, month, forceRefresh });
      return {
        events: res.events ?? [],
        isOffline: res.isOffline ?? res.is_offline ?? false,
        cachedAt: res.cachedAt ?? res.cached_at,
        lastError: res.lastError ?? res.last_error,
      };
    } catch (err) {
      console.warn('[Tauri] Fallback to local offline calc:', err);
    }
  }

  const cacheKey = `${STORAGE_KEYS.EVENTS_CACHE_PREFIX}${year}_${month}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached && !forceRefresh) {
    try {
      const parsed = JSON.parse(cached);
      return {
        events: parsed.events ?? [],
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
      const remote = await callTauri<AppSettings>('get_settings');
      return { ...DEFAULT_SETTINGS, ...remote };
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
      return;
    } catch (err) {
      console.warn('[Tauri] Fallback save settings:', err);
    }
  }

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
