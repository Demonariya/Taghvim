/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDay,
  TimeIrEvent,
  PersonalNote,
  AppSettings,
} from '../types/calendar.ts';
import { getTodayJalali } from '../utils/persianDate.ts';
import { buildMonthGrid } from '../services/calendarGrid.ts';
import {
  getMonthEvents,
  getNotes,
  saveNote,
  deleteNote,
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from '../services/storageService.ts';
import { recordFrontendStage } from '../services/diagnostics.ts';

export interface TaghvimAppOptions {
  onBeforeSaveReminder?: () => Promise<void>;
}

export function useTaghvimApp(options?: TaghvimAppOptions) {
  const [today] = useState(() => getTodayJalali());
  const [currentYear, setCurrentYear] = useState<number>(today.year);
  const [currentMonth, setCurrentMonth] = useState<number>(today.month);

  const [events, setEvents] = useState<TimeIrEvent[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const onBeforeSaveReminder = options?.onBeforeSaveReminder;

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      recordFrontendStage('load_initial_data_start');
      const [storedSettings, storedNotes] = await Promise.all([
        getSettings(),
        getNotes(),
      ]);
      if (!active) return;
      setSettings(storedSettings);
      setNotes(storedNotes);
      recordFrontendStage('load_initial_data_done', `notes=${storedNotes.length}`);
    }
    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  const loadMonthData = useCallback(
    async (year: number, month: number, forceRefresh = false) => {
      try {
        const res = await getMonthEvents(year, month, forceRefresh);
        setEvents(res.events);
        setIsOffline(res.isOffline);
        if (res.lastError) {
          setSettings((prev) => ({ ...prev, lastError: res.lastError }));
        }
      } catch (err: unknown) {
        console.warn('Error loading month events:', err);
        setIsOffline(true);
        const errMsg = err instanceof Error ? err.message : String(err);
        setSettings((prev) => ({ ...prev, lastError: errMsg }));
      }
    },
    []
  );

  useEffect(() => {
    loadMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth, loadMonthData]);

  const days = useMemo(
    () =>
      buildMonthGrid(
        currentYear,
        currentMonth,
        events,
        notes,
        settings.firstDayOfWeek
      ),
    [currentYear, currentMonth, events, notes, settings.firstDayOfWeek]
  );

  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleJumpToday = useCallback(() => {
    setCurrentYear(today.year);
    setCurrentMonth(today.month);
    const todayGrid =
      currentYear === today.year && currentMonth === today.month
        ? days
        : buildMonthGrid(
            today.year,
            today.month,
            events,
            notes,
            settings.firstDayOfWeek
          );
    const todayCell = todayGrid.find(
      (d) =>
        d.jalaliYear === today.year &&
        d.jalaliMonth === today.month &&
        d.jalaliDay === today.day
    );
    if (todayCell) {
      setSelectedDay(todayCell);
    }
  }, [
    today.year,
    today.month,
    today.day,
    currentYear,
    currentMonth,
    days,
    events,
    notes,
    settings.firstDayOfWeek,
  ]);

  const handleSelectYearMonth = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  }, []);

  const handleAddNote = useCallback(
    async (newNoteData: Omit<PersonalNote, 'id' | 'createdAt'>) => {
      if (newNoteData.hasReminder && onBeforeSaveReminder) {
        await onBeforeSaveReminder();
      }
      const newNote: PersonalNote = {
        ...newNoteData,
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      const updated = await saveNote(newNote);
      setNotes(updated);
    },
    [onBeforeSaveReminder]
  );

  const handleDeleteNote = useCallback(async (id: string) => {
    const updated = await deleteNote(id);
    setNotes(updated);
  }, []);

  const handleToggleNoteComplete = useCallback(
    async (id: string) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      const updatedNote = { ...target, isCompleted: !target.isCompleted };
      const updated = await saveNote(updatedNote);
      setNotes(updated);
    },
    [notes]
  );

  const handleUpdateSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, []);

  const handleRefreshCache = useCallback(async () => {
    await loadMonthData(currentYear, currentMonth, true);
  }, [currentYear, currentMonth, loadMonthData]);

  return {
    today,
    currentYear,
    currentMonth,
    days,
    events,
    notes,
    settings,
    isOffline,
    selectedDay,
    setSelectedDay,
    isConverterOpen,
    setIsConverterOpen,
    isNotesOpen,
    setIsNotesOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    handlePrevMonth,
    handleNextMonth,
    handleJumpToday,
    handleSelectYearMonth,
    handleAddNote,
    handleDeleteNote,
    handleToggleNoteComplete,
    handleUpdateSettings,
    handleRefreshCache,
  };
}
