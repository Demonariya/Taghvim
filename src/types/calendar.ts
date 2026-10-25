export interface TimeIrEvent {
  id: string;
  jalaliYear: number;
  jalaliMonth: number;
  jalaliDay: number;
  isHoliday: boolean;
  title: string;
  description?: string;
  source: string;
}

export interface CalendarDay {
  jalaliYear: number;
  jalaliMonth: number;
  jalaliDay: number;
  gregorianYear: number;
  gregorianMonth: number;
  gregorianDay: number;
  hijriYear: number;
  hijriMonth: number;
  hijriDay: number;
  dayOfWeek: number; // 0: شنبه (Saturday), ..., 6: جمعه (Friday)
  dayName: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFriday: boolean;
  isHoliday: boolean;
  events: TimeIrEvent[];
  hasNotes: boolean;
}

export interface PersonalNote {
  id: string;
  jalaliYear: number;
  jalaliMonth: number;
  jalaliDay: number;
  title: string;
  description: string;
  reminderTime?: string; // HH:mm format (24-hour)
  hasReminder: boolean;
  isCompleted: boolean;
  createdAt: number;
}

export interface AppSettings {
  autostart: boolean;
  firstDayOfWeek: 0 | 1; // 0: شنبه, 1: یکشنبه
  showHijri: boolean;
  showGregorian: boolean;
  enableNotifications: boolean;
  accentColor: string;
  lastCacheSync?: string;
  offlineMode: boolean;
  globalShortcut: string;
  lastError?: string;
}

export interface DateConversionResult {
  jalali: {
    year: number;
    month: number;
    day: number;
    formatted: string;
  };
  gregorian: {
    year: number;
    month: number;
    day: number;
    formatted: string;
  };
  hijri: {
    year: number;
    month: number;
    day: number;
    formatted: string;
  };
  dayOfWeekName: string;
}
