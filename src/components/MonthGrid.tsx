import React from 'react';
import { CalendarDay, AppSettings } from '../types/calendar.ts';
import { DayCell } from './DayCell.tsx';
import { PERSIAN_WEEK_DAYS } from '../utils/persianDate.ts';

interface MonthGridProps {
  days: CalendarDay[];
  selectedDay: CalendarDay | null;
  onSelectDay: (day: CalendarDay) => void;
  settings: AppSettings;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  days,
  selectedDay,
  onSelectDay,
  settings,
}) => {
  const weekDaysHeader =
    settings.firstDayOfWeek === 1
      ? [
          PERSIAN_WEEK_DAYS[1],
          PERSIAN_WEEK_DAYS[2],
          PERSIAN_WEEK_DAYS[3],
          PERSIAN_WEEK_DAYS[4],
          PERSIAN_WEEK_DAYS[5],
          PERSIAN_WEEK_DAYS[6],
          PERSIAN_WEEK_DAYS[0],
        ]
      : PERSIAN_WEEK_DAYS;

  return (
    <div className="flex-1 flex flex-col p-2 overflow-y-auto select-none">
      {/* Weekday Row */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 shrink-0">
        {weekDaysHeader.map((wName, idx) => {
          const isFridayCol =
            (settings.firstDayOfWeek === 0 && idx === 6) ||
            (settings.firstDayOfWeek === 1 && idx === 5);

          return (
            <div
              key={wName}
              className={`py-1 text-center text-[11px] rounded border ${
                isFridayCol
                  ? 'border-[#232834] text-[#ef4444]'
                  : 'border-[#232834] text-[#8b93a5] bg-[#14171f]'
              }`}
            >
              {wName}
            </div>
          );
        })}
      </div>

      {/* 7-Column Days Grid */}
      <div className="grid grid-cols-7 gap-1 auto-rows-fr flex-1">
        {days.map((day, index) => {
          const isSelected =
            selectedDay !== null &&
            selectedDay.jalaliYear === day.jalaliYear &&
            selectedDay.jalaliMonth === day.jalaliMonth &&
            selectedDay.jalaliDay === day.jalaliDay;

          return (
            <DayCell
              key={`${day.jalaliYear}-${day.jalaliMonth}-${day.jalaliDay}-${index}`}
              day={day}
              isSelected={isSelected}
              onSelect={onSelectDay}
              settings={settings}
            />
          );
        })}
      </div>
    </div>
  );
};
