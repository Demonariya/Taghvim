/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar.tsx';
import { Header } from './components/Header.tsx';
import { MonthGrid } from './components/MonthGrid.tsx';
import { BottomActionBar } from './components/BottomActionBar.tsx';
import { DayDetailModal } from './components/DayDetailModal.tsx';
import { DateConverter } from './components/DateConverter.tsx';
import { NotesReminders } from './components/NotesReminders.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { TrayPopupView } from './components/TrayPopupView.tsx';
import { isAndroid } from './platform.ts';
import {
  CalendarDay,
  TimeIrEvent,
  PersonalNote,
  AppSettings,
} from './types/calendar.ts';
import {
  getTodayJalali,
} from './utils/persianDate.ts';
import {
  getMonthEvents,
  buildMonthGrid,
  getNotes,
  saveNote,
  deleteNote,
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  isTauri,
} from './services/tauriBridge.ts';

export default function App() {
  const [today] = useState(() => getTodayJalali());
  const [currentYear, setCurrentYear] = useState<number>(today.year);
  const [currentMonth, setCurrentMonth] = useState<number>(today.month);

  const [events, setEvents] = useState<TimeIrEvent[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Modals state
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Android hardware back button handler: closes open dialog first before exiting
  const anyModalOpen = Boolean(selectedDay || isConverterOpen || isNotesOpen || isSettingsOpen);

  useEffect(() => {
    if (!isAndroid) return;

    if (anyModalOpen) {
      window.history.pushState({ modalOpen: true }, '');
    }

    const handlePopState = () => {
      if (selectedDay) {
        setSelectedDay(null);
      } else if (isConverterOpen) {
        setIsConverterOpen(false);
      } else if (isNotesOpen) {
        setIsNotesOpen(false);
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [anyModalOpen, selectedDay, isConverterOpen, isNotesOpen, isSettingsOpen]);

  // Detect Tray Popup View routed via hash #/tray
  const [isTrayRoute, setIsTrayRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.hash.includes('#/tray') ||
        window.location.search.includes('view=tray')
      );
    }
    return false;
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setIsTrayRoute(
        window.location.hash.includes('#/tray') ||
        window.location.search.includes('view=tray')
      );
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Load initial settings and notes
  useEffect(() => {
    async function loadInitial() {
      const storedSettings = await getSettings();
      setSettings(storedSettings);
      const storedNotes = await getNotes();
      setNotes(storedNotes);
    }
    loadInitial();
  }, []);

  // Fetch events whenever month/year changes
  const loadMonthData = useCallback(async (year: number, month: number, forceRefresh = false) => {
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
  }, []);

  useEffect(() => {
    loadMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth, loadMonthData]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Jump to today
  const handleJumpToday = useCallback(() => {
    setCurrentYear(today.year);
    setCurrentMonth(today.month);
    const todayCell = days.find(
      (d) => d.jalaliYear === today.year && d.jalaliMonth === today.month && d.jalaliDay === today.day
    );
    if (todayCell) {
      setSelectedDay(todayCell);
    }
  }, [today.year, today.month, today.day]);

  // Listen to Tauri jump-today event from Tray right-click menu
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (isTauri() && !isAndroid) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('taghvim-jump-today', () => {
          handleJumpToday();
        }).then((cleanup) => {
          unlisten = cleanup;
        });
      }).catch((err) => {
        console.warn('Tray listener registration error:', err);
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [handleJumpToday]);

  const handleSelectYearMonth = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // Notes actions
  const handleAddNote = async (newNoteData: Omit<PersonalNote, 'id' | 'createdAt'>) => {
    const newNote: PersonalNote = {
      ...newNoteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    const updated = await saveNote(newNote);
    setNotes(updated);
  };

  const handleDeleteNote = async (id: string) => {
    const updated = await deleteNote(id);
    setNotes(updated);
  };

  const handleToggleNoteComplete = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const updatedNote = { ...target, isCompleted: !target.isCompleted };
    const updated = await saveNote(updatedNote);
    setNotes(updated);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleRefreshCache = async () => {
    await loadMonthData(currentYear, currentMonth, true);
  };

  // Compute month calendar days
  const days = buildMonthGrid(
    currentYear,
    currentMonth,
    events,
    notes,
    settings.firstDayOfWeek
  );

  // If this window is routed to #/tray, render the native tray popup view
  if (isTrayRoute) {
    return (
      <div dir="rtl" className="w-screen h-screen flex items-center justify-center bg-transparent">
        <TrayPopupView
          days={days}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onJumpToday={handleJumpToday}
          onSelectDay={(day) => setSelectedDay(day)}
          events={events}
          settings={settings}
        />

        {/* Day Detail & Events Modal inside popup */}
        <DayDetailModal
          day={selectedDay}
          notes={notes}
          onClose={() => setSelectedDay(null)}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onToggleNoteComplete={handleToggleNoteComplete}
          settings={settings}
        />
      </div>
    );
  }

  // Desktop: 390x780 centered phone frame. Android: full-screen with safe-area padding.
  return (
    <div
      dir="rtl"
      className={
        isAndroid
          ? 'w-full h-full min-h-[100dvh] bg-[#0d0f14] flex flex-col overflow-hidden select-none text-[#e6e9ef] android-full-screen'
          : 'w-screen h-screen bg-[#07080b] flex items-center justify-center p-0 sm:p-4 overflow-hidden select-none text-[#e6e9ef]'
      }
    >
      {/* Phone frame: full-screen on Android, 390x780 centered on desktop */}
      <div
        className={
          isAndroid
            ? 'w-full h-full flex-1 flex flex-col overflow-hidden relative'
            : 'w-full max-w-[390px] h-full max-h-[780px] bg-[#0d0f14] border border-[#232834] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative'
        }
      >
        {/* Custom Window Title Bar (drag region, controls, app name - desktop only) */}
        <TitleBar />

        {/* Mobile Header: Clock, Online/Offline Badge, Month navigation & selector */}
        <Header
          currentYear={currentYear}
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectYearMonth={handleSelectYearMonth}
          isOffline={isOffline}
          settings={settings}
        />

        {/* Calendar Month Grid */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <MonthGrid
            days={days}
            selectedDay={selectedDay}
            onSelectDay={(day) => setSelectedDay(day)}
            settings={settings}
          />
        </main>

        {/* Bottom Action Bar: امروز، تبدیل تاریخ، یادآورها، تنظیمات */}
        <BottomActionBar
          onJumpToday={handleJumpToday}
          onOpenConverter={() => setIsConverterOpen(true)}
          onOpenNotes={() => setIsNotesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Day Detail & Events / Notes Modal */}
        <DayDetailModal
          day={selectedDay}
          notes={notes}
          onClose={() => setSelectedDay(null)}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onToggleNoteComplete={handleToggleNoteComplete}
          settings={settings}
        />

        {/* Date Converter Modal */}
        <DateConverter
          isOpen={isConverterOpen}
          onClose={() => setIsConverterOpen(false)}
        />

        {/* Notes & Reminders Overview Modal */}
        <NotesReminders
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
          notes={notes}
          onDeleteNote={handleDeleteNote}
          onToggleNoteComplete={handleToggleNoteComplete}
          settings={settings}
        />

        {/* Settings Modal (scrollable max-h-[85vh], shows v0.0.1, last_error) */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onRefreshCache={handleRefreshCache}
          isOffline={isOffline}
        />
      </div>
    </div>
  );
}
