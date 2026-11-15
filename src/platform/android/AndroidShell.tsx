/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Header } from '../../components/Header.tsx';
import { MonthGrid } from '../../components/MonthGrid.tsx';
import { BottomActionBar } from '../../components/BottomActionBar.tsx';
import { DayDetailModal } from '../../components/DayDetailModal.tsx';
import { DateConverter } from '../../components/DateConverter.tsx';
import { NotesReminders } from '../../components/NotesReminders.tsx';
import { SettingsModal } from '../../components/SettingsModal.tsx';
import { useTaghvimApp } from '../../shared/hooks/useTaghvimApp.ts';
import {
  getAndroidWebViewVersion,
  isWebViewOutdated,
  markAndroidPlatformActive,
  requestAndroidNotificationPermission,
  sendAndroidNotification,
} from './adapter.ts';
import { AndroidSettingsSection } from './AndroidSettingsSection.tsx';
import './android.css';

export const AndroidShell: React.FC = () => {
  useEffect(() => {
    markAndroidPlatformActive();
  }, []);

  if (isWebViewOutdated()) {
    const currentVer = getAndroidWebViewVersion();
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-[#07080b] text-[#e6e9ef]"
      >
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#14171f] border border-amber-500/30 text-center shadow-2xl flex flex-col gap-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl text-amber-400">
            نیاز به به‌روزرسانی WebView اندروید
          </h1>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            نسخه مرورگر سیستمی (WebView) دستگاه شما قدیمی است{' '}
            {currentVer ? `(نسخه ${currentVer})` : ''}. تقویم برای اجرا نیازمند حداقل نسخه ۱۱۱ است.
          </p>
          <p className="text-xs text-[#6b7280]">
            لطفاً برنامه <strong>Android System WebView</strong> یا <strong>Google Chrome</strong> را از فروشگاه برنامه گوشی خود به‌روزرسانی کنید.
          </p>
        </div>
      </div>
    );
  }

  return <AndroidCalendarContent />;
};

const AndroidCalendarContent: React.FC = () => {
  const {
    currentYear,
    currentMonth,
    days,
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
  } = useTaghvimApp({
    onBeforeSaveReminder: requestAndroidNotificationPermission,
  });

  // Android hardware back button handler: closes open dialog first before exiting
  const anyModalOpen = Boolean(
    selectedDay || isConverterOpen || isNotesOpen || isSettingsOpen
  );

  useEffect(() => {
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
  }, [
    anyModalOpen,
    selectedDay,
    isConverterOpen,
    isNotesOpen,
    isSettingsOpen,
    setSelectedDay,
    setIsConverterOpen,
    setIsNotesOpen,
    setIsSettingsOpen,
  ]);

  return (
    <div
      dir="rtl"
      className="w-full h-full min-h-[100dvh] bg-[#0d0f14] flex flex-col overflow-hidden select-none text-[#e6e9ef] android-full-screen"
    >
      <div className="w-full h-full flex-1 flex flex-col overflow-hidden relative">
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
          onSendNotification={sendAndroidNotification}
          notificationTestBody="سیستم اعلان‌های اندروید با موفقیت متصل است و به درستی کار می‌کند!"
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onRefreshCache={handleRefreshCache}
          isOffline={isOffline}
          platformLabel="Android"
          notificationTitle="اعلان‌ها و یادآورها"
          notificationSubtitle="ارسال اعلان یادآوری رویدادها و یادداشت‌ها"
          platformSection={<AndroidSettingsSection />}
        />
      </div>
    </div>
  );
};

export default AndroidShell;
