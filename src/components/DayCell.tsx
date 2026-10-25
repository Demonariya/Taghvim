import React from 'react';
import { CalendarDay, AppSettings } from '../types/calendar.ts';
import { toFa, HIJRI_MONTH_NAMES, GREGORIAN_MONTH_NAMES } from '../utils/persianDate.ts';

interface DayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  onSelect: (day: CalendarDay) => void;
  settings: AppSettings;
}

export const DayCell: React.FC<DayCellProps> = ({
  day,
  isSelected,
  onSelect,
  settings,
}) => {
  const isWeekendOrHoliday = day.isFriday || day.isHoliday;

  // Base colors
  let textDayClass = 'text-[#e6e9ef]';
  let borderClass = 'border-[#232834] hover:border-[#8b93a5]';
  let bgClass = 'bg-[#14171f] hover:bg-[#1b202c]';

  if (!day.isCurrentMonth) {
    textDayClass = 'text-[#3b4252]';
    bgClass = 'bg-[#0d0f14] hover:bg-[#14171f]';
    borderClass = 'border-[#1b202c]';
  } else if (isWeekendOrHoliday) {
    // Holidays and Fridays: muted red text, NO red-filled background
    textDayClass = 'text-[#ef4444]';
    borderClass = 'border-[#232834] hover:border-[#ef4444]/60';
  }

  // Today highlight: soft cyan accent border
  if (day.isToday) {
    borderClass = 'border border-[#22d3ee]';
    bgClass = 'bg-[#14171f]';
    textDayClass = 'text-[#22d3ee]';
  }

  // Selected cell
  if (isSelected) {
    borderClass = 'border-2 border-[#22d3ee]';
  }

  return (
    <div
      onClick={() => onSelect(day)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(day);
        }
      }}
      className={`relative min-h-[48px] sm:min-h-[56px] p-1 sm:p-1.5 flex flex-col justify-between rounded-lg border transition-colors cursor-pointer select-none ${borderClass} ${bgClass}`}
    >
      {/* Top Bar: Jalali Day & Today / Indicator */}
      <div className="flex items-start justify-between w-full">
        <div className="flex items-center gap-1">
          <span className={`text-sm sm:text-base font-mono-num ${textDayClass}`}>
            {toFa(day.jalaliDay)}
          </span>
          {day.isToday && (
            <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-[#22d3ee] text-[#0d0f14]">
              امروز
            </span>
          )}
        </div>

        {/* Indicator dots */}
        <div className="flex items-center gap-1">
          {day.events.length > 0 && (
            <span
              title={`${toFa(day.events.length)} رویداد`}
              className={`w-1.5 h-1.5 rounded-full ${
                day.isHoliday ? 'bg-[#ef4444]' : 'bg-[#22d3ee]'
              }`}
            />
          )}
          {day.hasNotes && (
            <span
              title="دارای یادداشت یا یادآور"
              className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"
            />
          )}
        </div>
      </div>

      {/* Center Event Title Snippet if space allows */}
      {day.isCurrentMonth && day.events.length > 0 && (
        <div className="hidden xs:block my-0.5 text-[10px] truncate w-full leading-tight">
          <span className={`truncate block ${day.isHoliday ? 'text-[#ef4444]' : 'text-[#8b93a5]'}`}>
            {day.events[0]?.title}
          </span>
        </div>
      )}

      {/* Bottom Row: Gregorian and Hijri secondary dates */}
      <div className="flex items-center justify-between text-[9px] font-mono-num text-[#8b93a5] pt-0.5 border-t border-[#232834]/50 mt-auto">
        {settings.showGregorian ? (
          <span title={`میلادی: ${day.gregorianDay} ${GREGORIAN_MONTH_NAMES[day.gregorianMonth - 1]}`}>
            {toFa(day.gregorianDay)}
          </span>
        ) : (
          <span />
        )}

        {settings.showHijri ? (
          <span
            title={`قمری: ${day.hijriDay} ${HIJRI_MONTH_NAMES[day.hijriMonth - 1]}`}
            className="text-[#8b93a5]"
          >
            {toFa(day.hijriDay)} ق
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
};
