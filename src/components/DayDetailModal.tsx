import React, { useState } from 'react';
import {
  X,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Bookmark,
} from 'lucide-react';
import { CalendarDay, PersonalNote, AppSettings } from '../types/calendar.ts';
import {
  formatFullPersianDate,
  toFa,
  GREGORIAN_MONTH_NAMES,
  HIJRI_MONTH_NAMES,
} from '../utils/persianDate.ts';

interface DayDetailModalProps {
  day: CalendarDay | null;
  notes: PersonalNote[];
  onClose: () => void;
  onAddNote: (note: Omit<PersonalNote, 'id' | 'createdAt'>) => void;
  onDeleteNote: (id: string) => void;
  onToggleNoteComplete: (id: string) => void;
  settings: AppSettings;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  day,
  notes,
  onClose,
  onAddNote,
  onDeleteNote,
  onToggleNoteComplete,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [activeTab, setActiveTab] = useState<'events' | 'notes'>('events');

  if (!day) return null;

  const dayNotes = notes.filter(
    (n) =>
      n.jalaliYear === day.jalaliYear &&
      n.jalaliMonth === day.jalaliMonth &&
      n.jalaliDay === day.jalaliDay
  );

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!newTitle.trim()) {
      setValidationError('لطفاً عنوان یادداشت را وارد کنید.');
      return;
    }

    if (hasReminder && !newReminderTime) {
      setValidationError('لطفاً ساعت یادآور (HH:mm) را مشخص کنید.');
      return;
    }

    onAddNote({
      jalaliYear: day.jalaliYear,
      jalaliMonth: day.jalaliMonth,
      jalaliDay: day.jalaliDay,
      title: newTitle.trim(),
      description: newDesc.trim(),
      reminderTime: hasReminder ? newReminderTime : undefined,
      hasReminder,
      isCompleted: false,
    });

    setNewTitle('');
    setNewDesc('');
    setNewReminderTime('');
    setHasReminder(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 select-none dialog-overlay">
      <div className="relative w-full max-w-[360px] bg-[#14171f] border border-[#232834] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] dialog-sheet">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#232834] bg-[#0d0f14]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#22d3ee]" />
            <div>
              <h3 className="text-xs text-[#e6e9ef]">
                {formatFullPersianDate(day.jalaliYear, day.jalaliMonth, day.jalaliDay)}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-[#8b93a5] mt-0.5 font-mono-num">
                <span>
                  میلادی: {toFa(day.gregorianDay)} {GREGORIAN_MONTH_NAMES[day.gregorianMonth - 1]} {toFa(day.gregorianYear)}
                </span>
                <span>•</span>
                <span>
                  قمری: {toFa(day.hijriDay)} {HIJRI_MONTH_NAMES[day.hijriMonth - 1]}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#8b93a5] hover:text-[#e6e9ef] hover:bg-[#1b202c] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-[#232834] bg-[#14171f] text-xs">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'events'
                ? 'border-[#22d3ee] text-[#22d3ee]'
                : 'border-transparent text-[#8b93a5] hover:text-[#e6e9ef]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            مناسبت‌ها ({toFa(day.events.length)})
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'border-[#22d3ee] text-[#22d3ee]'
                : 'border-transparent text-[#8b93a5] hover:text-[#e6e9ef]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            یادداشت‌ها ({toFa(dayNotes.length)})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-3 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'events' && (
            <div className="space-y-2">
              {day.isHoliday && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#0d0f14] border border-[#ef4444]/40 text-[#ef4444] text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>این روز تعطیل رسمی است {day.isFriday ? '(جمعه)' : ''}</span>
                </div>
              )}

              {day.events.length === 0 ? (
                <div className="text-center py-6 text-[#8b93a5] text-xs">
                  رویدادی برای این روز ثبت نشده است.
                </div>
              ) : (
                day.events.map((event) => (
                  <div
                    key={event.id}
                    className="p-2.5 rounded-lg border border-[#232834] bg-[#0d0f14] space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            event.isHoliday ? 'bg-[#ef4444]' : 'bg-[#22d3ee]'
                          }`}
                        />
                        <h4
                          className={`text-xs ${
                            event.isHoliday ? 'text-[#ef4444]' : 'text-[#e6e9ef]'
                          }`}
                        >
                          {event.title}
                        </h4>
                      </div>

                      {event.isHoliday && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded border border-[#ef4444]/40 text-[#ef4444] shrink-0">
                          تعطیل
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-[11px] text-[#8b93a5] pr-3 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              {/* Existing Notes list */}
              <div className="space-y-1.5">
                {dayNotes.length === 0 ? (
                  <p className="text-xs text-[#8b93a5] text-center py-2">
                    هیچ یادداشتی برای این روز ثبت نشده است.
                  </p>
                ) : (
                  dayNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2 rounded-lg bg-[#0d0f14] border border-[#232834] flex items-start justify-between gap-2"
                    >
                      <button
                        onClick={() => onToggleNoteComplete(note.id)}
                        className="mt-0.5 text-[#8b93a5] hover:text-[#22d3ee] cursor-pointer"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            note.isCompleted ? 'text-[#22d3ee]' : 'text-[#8b93a5]'
                          }`}
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs ${
                            note.isCompleted ? 'line-through text-[#8b93a5]' : 'text-[#e6e9ef]'
                          }`}
                        >
                          {note.title}
                        </p>
                        {note.description && (
                          <p className="text-[11px] text-[#8b93a5] mt-0.5 leading-normal">
                            {note.description}
                          </p>
                        )}
                        {note.hasReminder && note.reminderTime && (
                          <div className="flex items-center gap-1 text-[10px] text-[#f59e0b] mt-1 font-mono-num">
                            <Clock className="w-3 h-3" />
                            <span>ساعت یادآور: {toFa(note.reminderTime)}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 rounded text-[#8b93a5] hover:text-[#ef4444] cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note & Reminder Form */}
              <form
                onSubmit={handleSubmitNote}
                className="p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834] space-y-2 text-xs"
              >
                <div className="text-[#e6e9ef] flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-[#22d3ee]" />
                  افزودن یادداشت / یادآور جدید:
                </div>

                {validationError && (
                  <p className="text-[11px] text-[#ef4444]">{validationError}</p>
                )}

                <input
                  type="text"
                  placeholder="عنوان یادداشت یا کار..."
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-[#14171f] border border-[#232834] text-xs text-[#e6e9ef] placeholder-[#8b93a5] focus:border-[#22d3ee] outline-none"
                  required
                />

                <textarea
                  placeholder="توضیحات (اختیاری)..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 rounded bg-[#14171f] border border-[#232834] text-xs text-[#e6e9ef] placeholder-[#8b93a5] focus:border-[#22d3ee] outline-none resize-none"
                />

                {/* Reminder Checkbox & Time Picker */}
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#e6e9ef] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasReminder}
                      onChange={(e) => setHasReminder(e.target.checked)}
                      className="rounded accent-[#22d3ee]"
                    />
                    <span>تنظیم یادآور و نوتیفیکیشن</span>
                  </label>

                  {hasReminder && (
                    <div className="flex items-center gap-2 pr-5">
                      <span className="text-[11px] text-[#8b93a5]">ساعت یادآوری:</span>
                      <input
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => {
                          setNewReminderTime(e.target.value);
                          if (validationError) setValidationError('');
                        }}
                        className="px-2 py-1 rounded bg-[#14171f] border border-[#232834] text-xs text-[#e6e9ef] focus:border-[#22d3ee] outline-none font-mono-num"
                        required={hasReminder}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-[#22d3ee] text-[#0d0f14] text-xs hover:bg-[#22d3ee]/90 transition-colors cursor-pointer"
                  >
                    ثبت یادداشت
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
