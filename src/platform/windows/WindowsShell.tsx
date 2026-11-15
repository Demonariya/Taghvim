/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from '../../components/Header.tsx';
import { MonthGrid } from '../../components/MonthGrid.tsx';
import { BottomActionBar } from '../../components/BottomActionBar.tsx';
import { DayDetailModal } from '../../components/DayDetailModal.tsx';
import { DateConverter } from '../../components/DateConverter.tsx';
import { NotesReminders } from '../../components/NotesReminders.tsx';
import { SettingsModal } from '../../components/SettingsModal.tsx';
import { useTaghvimApp } from '../../shared/hooks/useTaghvimApp.ts';
import { AppSettings } from '../../shared/types/calendar.ts';
import {
  markWindowsPlatformActive,
  sendWindowsNotification,
  subscribeTrayJumpToday,
  syncWindowsAutostart,
} from './adapter.ts';
import { TitleBar } from './TitleBar.tsx';
import { TrayPopupView } from './TrayPopupView.tsx';
import { WindowsSettingsSection } from './WindowsSettingsSection.tsx';

export const WindowsShell: React.FC = () => {
  useEffect(() => {
    markWindowsPlatformActive();
  }, []);

  const {
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
  } = useTaghvimApp();

  // Tray Popup View routed via hash #/tray (Windows only)
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

  useEffect(() => {
    return subscribeTrayJumpToday(handleJumpToday);
  }, [handleJumpToday]);

  const handleUpdateWindowsSettings = async (next: AppSettings) => {
    await handleUpdateSettings(next);
    if (next.autostart !== settings.autostart) {
      await syncWindowsAutostart(next.autostart);
    }
  };

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

  return (
    <div
      dir="rtl"
      className="w-screen h-screen bg-[#07080b] flex items-center justify-center p-0 sm:p-4 overflow-hidden select-none text-[#e6e9ef]"
    >
      <div className="w-full max-w-[390px] h-full max-h-[780px] bg-[#0d0f14] border border-[#232834] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        <TitleBar />

        <Header
          currentYear={currentYear}
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectYearMonth={handleSelectYearMonth}
          isOffline={isOffline}
          settings={settings}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <MonthGrid
            days={days}
            selectedDay={selectedDay}
            onSelectDay={(day) => setSelectedDay(day)}
            settings={settings}
          />
        </main>

        <BottomActionBar
          onJumpToday={handleJumpToday}
          onOpenConverter={() => setIsConverterOpen(true)}
          onOpenNotes={() => setIsNotesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <DayDetailModal
          day={selectedDay}
          notes={notes}
          onClose={() => setSelectedDay(null)}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onToggleNoteComplete={handleToggleNoteComplete}
          settings={settings}
        />

        <DateConverter
          isOpen={isConverterOpen}
          onClose={() => setIsConverterOpen(false)}
        />

        <NotesReminders
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
          notes={notes}
          onDeleteNote={handleDeleteNote}
          onToggleNoteComplete={handleToggleNoteComplete}
          settings={settings}
          onSendNotification={sendWindowsNotification}
          notificationTestBody="سیستم اعلان‌های ویندوز با موفقیت متصل است و به درستی کار می‌کند!"
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateWindowsSettings}
          onRefreshCache={handleRefreshCache}
          isOffline={isOffline}
          platformLabel="Desktop"
          notificationTitle="اعلان‌های بومی ویندوز"
          notificationSubtitle="ارسال اعلان حتی هنگام پنهان بودن پنجره"
          platformSection={
            <WindowsSettingsSection
              settings={settings}
              onUpdateSettings={handleUpdateWindowsSettings}
            />
          }
        />
      </div>
    </div>
  );
};

export default WindowsShell;
