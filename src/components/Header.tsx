import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  WifiOff,
  Wifi,
} from 'lucide-react';
import {
  JALALI_MONTH_NAMES,
  toFa,
} from '../utils/persianDate.ts';
import { AppSettings } from '../types/calendar.ts';

interface HeaderProps {
  currentYear: number;
  currentMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectYearMonth: (year: number, month: number) => void;
  isOffline: boolean;
  settings: AppSettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentYear,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onSelectYearMonth,
  isOffline,
  settings,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showPicker, setShowPicker] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const monthOptions = JALALI_MONTH_NAMES.map((name, index) => ({
    name,
    value: index + 1,
  }));

  const yearRange = Array.from({ length: 21 }, (_, i) => 1395 + i);

  return (
    <div className="p-3 bg-[#14171f] border-b border-[#232834] flex flex-col gap-2 shrink-0 select-none">
      {/* Top row: Clock & Status Badge */}
      <div className="flex items-center justify-between text-xs">
        {/* Monospace Clock using Digikala New with tabular-nums */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0d0f14] border border-[#232834] text-[#22d3ee] font-mono-num clock-text">
          <Clock className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span>{toFa(currentTime)}</span>
        </div>

        {/* Offline / Online real status badge */}
        {isOffline ? (
          <div
            title={settings.lastError ? `خطا: ${settings.lastError}` : 'حالت آفلاین (استفاده از کش یا محاسبات درونی)'}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d0f14] border border-[#ef4444]/40 text-[#ef4444] text-[11px]"
          >
            <WifiOff className="w-3 h-3" />
            <span>آفلاین</span>
          </div>
        ) : (
          <div
            title="متصل به سرور و داده‌های time.ir"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d0f14] border border-[#22d3ee]/40 text-[#22d3ee] text-[11px]"
          >
            <Wifi className="w-3 h-3" />
            <span>آنلاین</span>
          </div>
        )}
      </div>

      {/* Navigation row: Next Month, Month/Year Picker, Prev Month */}
      <div className="flex items-center justify-between relative">
        <button
          onClick={onNextMonth}
          title="ماه بعد"
          className="p-1.5 rounded-lg bg-[#0d0f14] border border-[#232834] hover:border-[#22d3ee] text-[#8b93a5] hover:text-[#e6e9ef] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-[#232834] hover:border-[#22d3ee] text-[#e6e9ef] text-sm transition-colors cursor-pointer"
          >
            <span className="text-[#22d3ee]">
              {JALALI_MONTH_NAMES[currentMonth - 1]}
            </span>
            <span className="text-[#8b93a5] font-mono-num">
              {toFa(currentYear)}
            </span>
          </button>

          {/* Quick Year/Month Picker Dropdown */}
          {showPicker && (
            <div className="absolute top-full mt-2 -right-8 w-64 p-3 bg-[#14171f] border border-[#232834] rounded-xl shadow-2xl z-50">
              <div className="text-[11px] text-[#8b93a5] mb-2 pb-1 border-b border-[#232834]">
                انتخاب سال و ماه:
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  value={currentYear}
                  onChange={(e) => onSelectYearMonth(parseInt(e.target.value, 10), currentMonth)}
                  className="bg-[#0d0f14] border border-[#232834] text-[#e6e9ef] rounded p-1.5 text-xs focus:border-[#22d3ee] outline-none"
                >
                  {yearRange.map((yr) => (
                    <option key={yr} value={yr}>
                      سال {toFa(yr)}
                    </option>
                  ))}
                </select>

                <select
                  value={currentMonth}
                  onChange={(e) => onSelectYearMonth(currentYear, parseInt(e.target.value, 10))}
                  className="bg-[#0d0f14] border border-[#232834] text-[#e6e9ef] rounded p-1.5 text-xs focus:border-[#22d3ee] outline-none"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {monthOptions.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => {
                      onSelectYearMonth(currentYear, m.value);
                      setShowPicker(false);
                    }}
                    className={`text-xs py-1.5 px-1 rounded transition-colors text-center cursor-pointer ${
                      m.value === currentMonth
                        ? 'bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40'
                        : 'bg-[#0d0f14] hover:bg-[#1b202c] text-[#8b93a5]'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onPrevMonth}
          title="ماه قبل"
          className="p-1.5 rounded-lg bg-[#0d0f14] border border-[#232834] hover:border-[#22d3ee] text-[#8b93a5] hover:text-[#e6e9ef] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
