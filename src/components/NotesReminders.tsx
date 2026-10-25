import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  Trash2,
  Clock,
} from 'lucide-react';
import { PersonalNote, AppSettings } from '../types/calendar.ts';
import {
  toFa,
  JALALI_MONTH_NAMES,
} from '../utils/persianDate.ts';
import { sendNotification } from '../services/tauriBridge.ts';

interface NotesRemindersProps {
  isOpen: boolean;
  onClose: () => void;
  notes: PersonalNote[];
  onDeleteNote: (id: string) => void;
  onToggleNoteComplete: (id: string) => void;
  settings: AppSettings;
}

export const NotesReminders: React.FC<NotesRemindersProps> = ({
  isOpen,
  onClose,
  notes,
  onDeleteNote,
  onToggleNoteComplete,
}) => {
  const [filter, setFilter] = useState<'all' | 'reminders' | 'completed'>('all');
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  if (!isOpen) return null;

  const filteredNotes = notes.filter((n) => {
    if (filter === 'reminders') return n.hasReminder && !n.isCompleted;
    if (filter === 'completed') return n.isCompleted;
    return true;
  });

  const handleTestNotification = async () => {
    await sendNotification(
      'تقویم جلالی | یادآور آزمایشی',
      'سیستم اعلان‌های ویندوز با موفقیت متصل است و به درستی کار می‌کند!'
    );
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 select-none dialog-overlay">
      <div className="relative w-full max-w-[360px] bg-[#14171f] border border-[#232834] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] dialog-sheet">
        <div className="flex items-center justify-between p-3 border-b border-[#232834] bg-[#0d0f14]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#22d3ee]" />
            <h3 className="text-xs text-[#e6e9ef]">یادداشت‌ها و یادآورها</h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTestNotification}
              className="px-2 py-1 rounded bg-[#0d0f14] border border-[#232834] hover:border-[#22d3ee] text-[#22d3ee] text-[10px] transition-colors cursor-pointer"
            >
              {testNotificationSent ? 'ارسال شد' : 'تست اعلان'}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-[#8b93a5] hover:text-[#e6e9ef] hover:bg-[#1b202c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 p-2 bg-[#0d0f14] border-b border-[#232834] text-[11px]">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded transition-colors cursor-pointer text-center ${
              filter === 'all'
                ? 'bg-[#14171f] text-[#22d3ee] border border-[#232834]'
                : 'text-[#8b93a5] hover:text-[#e6e9ef]'
            }`}
          >
            همه ({toFa(notes.length)})
          </button>

          <button
            onClick={() => setFilter('reminders')}
            className={`flex-1 py-1 rounded transition-colors cursor-pointer text-center ${
              filter === 'reminders'
                ? 'bg-[#14171f] text-[#22d3ee] border border-[#232834]'
                : 'text-[#8b93a5] hover:text-[#e6e9ef]'
            }`}
          >
            فعال ({toFa(notes.filter((n) => n.hasReminder && !n.isCompleted).length)})
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-1 rounded transition-colors cursor-pointer text-center ${
              filter === 'completed'
                ? 'bg-[#14171f] text-[#22d3ee] border border-[#232834]'
                : 'text-[#8b93a5] hover:text-[#e6e9ef]'
            }`}
          >
            انجام شده ({toFa(notes.filter((n) => n.isCompleted).length)})
          </button>
        </div>

        {/* List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2 text-xs">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-[#8b93a5] text-xs">
              موردی برای نمایش یافت نشد.
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className="p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834] flex items-start justify-between gap-2"
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#14171f] text-[#22d3ee] font-mono-num">
                      {toFa(note.jalaliDay)} {JALALI_MONTH_NAMES[note.jalaliMonth - 1]} {toFa(note.jalaliYear)}
                    </span>
                    {note.hasReminder && (
                      <span className="text-[10px] text-[#f59e0b] flex items-center gap-0.5 font-mono-num">
                        <Clock className="w-3 h-3" />
                        {toFa(note.reminderTime ?? '')}
                      </span>
                    )}
                  </div>

                  <h4
                    className={`text-xs mt-1 ${
                      note.isCompleted ? 'line-through text-[#8b93a5]' : 'text-[#e6e9ef]'
                    }`}
                  >
                    {note.title}
                  </h4>

                  {note.description && (
                    <p className="text-[11px] text-[#8b93a5] mt-0.5 leading-normal">
                      {note.description}
                    </p>
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
      </div>
    </div>
  );
};
