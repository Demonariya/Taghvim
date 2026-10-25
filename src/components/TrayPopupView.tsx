import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import {
  CalendarDay,
  TimeIrEvent,
  AppSettings,
} from '../types/calendar.ts';
import {
  formatFullPersianDate,
  toFa,
  JALALI_MONTH_NAMES,
  PERSIAN_WEEK_DAYS,
  getTodayJalali,
} from '../utils/persianDate.ts';
import { openMainWindow } from '../services/tauriBridge.ts';

interface TrayPopupViewProps {
  days: CalendarDay[];
  currentYear: number;
  currentMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToday: () => void;
  onSelectDay: (day: CalendarDay) => void;
  events: TimeIrEvent[];
  settings: AppSettings;
}

export const TrayPopupView: React.FC<TrayPopupViewProps> = ({
  days,
  currentYear,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  onSelectDay,
  events,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const today = getTodayJalali();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayEvents = events.filter((e) => e.jalaliDay === today.day);

  return (
    <div className="w-[360px] h-[520px] bg-[#0d0f14] border border-[#232834] rounded-xl flex flex-col overflow-hidden text-[#e6e9ef] select-none shadow-2xl">
      {/* Top Header: Date & Live Clock */}
      <div className="p-3 bg-[#14171f] border-b border-[#232834] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#22d3ee]" />
          <div>
            <div className="text-xs text-[#e6e9ef]">
              {formatFullPersianDate(today.year, today.month, today.day)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0d0f14] border border-[#232834] text-[#22d3ee] font-mono-num clock-text text-xs">
          <Clock className="w-3 h-3 text-[#22d3ee]" />
          <span>{toFa(currentTime)}</span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-[#232834] bg-[#14171f]/60">
        <div className="flex items-center gap-1">
          <button
            onClick={onNextMonth}
            className="p-1 rounded bg-[#0d0f14] text-[#8b93a5] hover:text-[#e6e9ef] border border-[#232834] transition-colors cursor-pointer"
            title="ماه بعد"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-[#22d3ee] px-2 font-mono-num">
            {JALALI_MONTH_NAMES[currentMonth - 1]} {toFa(currentYear)}
          </span>
          <button
            onClick={onPrevMonth}
            className="p-1 rounded bg-[#0d0f14] text-[#8b93a5] hover:text-[#e6e9ef] border border-[#232834] transition-colors cursor-pointer"
            title="ماه قبل"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onJumpToday}
          className="text-[11px] px-2 py-0.5 rounded bg-[#0d0f14] border border-[#232834] text-[#22d3ee] hover:bg-[#1b202c] flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          امروز
        </button>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 px-3 pt-2 text-[10px] text-center text-[#8b93a5]">
        {PERSIAN_WEEK_DAYS.map((w, i) => (
          <div key={w} className={i === 6 ? 'text-[#ef4444]' : ''}>
            {w.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Mini Month Grid */}
      <div className="grid grid-cols-7 gap-1 p-3">
        {days.slice(0, 35).map((d, idx) => {
          const isFri = d.isFriday;
          const isHol = d.isHoliday;
          let cellStyle = 'bg-[#14171f] text-[#e6e9ef] hover:bg-[#1b202c] border border-[#232834]';

          if (!d.isCurrentMonth) {
            cellStyle = 'bg-transparent text-[#3b4252] border-transparent';
          } else if (isFri || isHol) {
            cellStyle = 'bg-[#14171f] text-[#ef4444] border border-[#232834]';
          }

          if (d.isToday) {
            cellStyle = 'border border-[#22d3ee] bg-[#14171f] text-[#22d3ee]';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(d)}
              className={`h-7 rounded text-[11px] font-mono-num flex items-center justify-center relative transition-colors cursor-pointer ${cellStyle}`}
            >
              {toFa(d.jalaliDay)}
              {d.events.length > 0 && d.isCurrentMonth && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#22d3ee]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Today's Events Preview */}
      <div className="flex-1 px-3 py-2 overflow-y-auto border-t border-[#232834] space-y-1.5 bg-[#0d0f14]">
        <div className="text-[11px] text-[#8b93a5] flex items-center justify-between">
          <span>رویدادهای امروز:</span>
          {todayEvents.length > 0 && (
            <span className="text-[10px] text-[#22d3ee]">
              {toFa(todayEvents.length)} مورد
            </span>
          )}
        </div>

        {todayEvents.length === 0 ? (
          <p className="text-[11px] text-[#8b93a5] text-center py-2">
            امروز رویداد خاصی ثبت نشده است.
          </p>
        ) : (
          todayEvents.map((ev) => (
            <div
              key={ev.id}
              className={`p-1.5 rounded text-xs flex items-center gap-1.5 border border-[#232834] ${
                ev.isHoliday
                  ? 'bg-[#14171f] text-[#ef4444]'
                  : 'bg-[#14171f] text-[#e6e9ef]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  ev.isHoliday ? 'bg-[#ef4444]' : 'bg-[#22d3ee]'
                }`}
              />
              <span className="truncate flex-1">{ev.title}</span>
            </div>
          ))
        )}
      </div>

      {/* Bottom Bar: Open Main Window */}
      <div className="p-2.5 bg-[#14171f] border-t border-[#232834] flex items-center justify-between">
        <button
          onClick={() => openMainWindow()}
          className="w-full py-2 rounded-lg bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d0f14] text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>باز کردن پنجره اصلی تقویم</span>
        </button>
      </div>
    </div>
  );
};
