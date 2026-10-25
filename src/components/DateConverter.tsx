import React, { useState, useEffect } from 'react';
import {
  X,
  CalendarCheck,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  toFa,
  getTodayJalali,
  JALALI_MONTH_NAMES,
  GREGORIAN_MONTH_NAMES,
  HIJRI_MONTH_NAMES,
} from '../utils/persianDate.ts';
import { convertDateThreeWay } from '../services/tauriBridge.ts';
import { DateConversionResult } from '../types/calendar.ts';

interface DateConverterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DateConverter: React.FC<DateConverterProps> = ({ isOpen, onClose }) => {
  const [sourceType, setSourceType] = useState<'jalali' | 'gregorian' | 'hijri'>('jalali');
  const [year, setYear] = useState<number>(1405);
  const [month, setMonth] = useState<number>(8);
  const [day, setDay] = useState<number>(3);
  const [result, setResult] = useState<DateConversionResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const today = getTodayJalali();
    setYear(today.year);
    setMonth(today.month);
    setDay(today.day);
  }, []);

  useEffect(() => {
    if (year && month && day) {
      const res = convertDateThreeWay(sourceType, year, month, day);
      setResult(res);
    }
  }, [sourceType, year, month, day]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `📅 تبدیل تاریخ:
• روز هفته: ${result.dayOfWeekName}
• شمسی: ${result.jalali.formatted}
• میلادی: ${result.gregorian.formatted}
• قمری: ${result.hijri.formatted}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetToday = () => {
    setSourceType('jalali');
    const today = getTodayJalali();
    setYear(today.year);
    setMonth(today.month);
    setDay(today.day);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 select-none dialog-overlay">
      <div className="relative w-full max-w-[360px] bg-[#14171f] border border-[#232834] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] dialog-sheet">
        <div className="flex items-center justify-between p-3 border-b border-[#232834] bg-[#0d0f14]">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#22d3ee]" />
            <h3 className="text-xs text-[#e6e9ef]">تبدیل تاریخ</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#8b93a5] hover:text-[#e6e9ef] hover:bg-[#1b202c] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 overflow-y-auto space-y-3 text-xs">
          {/* Source Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0d0f14] border border-[#232834]">
            <button
              onClick={() => {
                setSourceType('jalali');
                const t = getTodayJalali();
                setYear(t.year);
                setMonth(t.month);
                setDay(t.day);
              }}
              className={`flex-1 py-1.5 rounded text-[11px] transition-colors cursor-pointer ${
                sourceType === 'jalali'
                  ? 'bg-[#22d3ee] text-[#0d0f14]'
                  : 'text-[#8b93a5] hover:text-[#e6e9ef]'
              }`}
            >
              شمسی
            </button>

            <button
              onClick={() => {
                setSourceType('gregorian');
                const now = new Date();
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
                setDay(now.getDate());
              }}
              className={`flex-1 py-1.5 rounded text-[11px] transition-colors cursor-pointer ${
                sourceType === 'gregorian'
                  ? 'bg-[#22d3ee] text-[#0d0f14]'
                  : 'text-[#8b93a5] hover:text-[#e6e9ef]'
              }`}
            >
              میلادی
            </button>

            <button
              onClick={() => {
                setSourceType('hijri');
                setYear(1448);
                setMonth(5);
                setDay(13);
              }}
              className={`flex-1 py-1.5 rounded text-[11px] transition-colors cursor-pointer ${
                sourceType === 'hijri'
                  ? 'bg-[#22d3ee] text-[#0d0f14]'
                  : 'text-[#8b93a5] hover:text-[#e6e9ef]'
              }`}
            >
              قمری
            </button>
          </div>

          {/* Inputs Row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-[#8b93a5] mb-1">روز:</label>
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1 rounded bg-[#0d0f14] border border-[#232834] text-[#e6e9ef] font-mono-num text-xs focus:border-[#22d3ee] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#8b93a5] mb-1">ماه:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="w-full px-1.5 py-1 rounded bg-[#0d0f14] border border-[#232834] text-[#e6e9ef] text-[11px] focus:border-[#22d3ee] outline-none"
              >
                {sourceType === 'jalali' &&
                  JALALI_MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {toFa(i + 1)} - {name}
                    </option>
                  ))}
                {sourceType === 'gregorian' &&
                  GREGORIAN_MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {toFa(i + 1)} - {name}
                    </option>
                  ))}
                {sourceType === 'hijri' &&
                  HIJRI_MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {toFa(i + 1)} - {name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#8b93a5] mb-1">سال:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || 1400)}
                className="w-full px-2 py-1 rounded bg-[#0d0f14] border border-[#232834] text-[#e6e9ef] font-mono-num text-xs focus:border-[#22d3ee] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSetToday}
              className="text-[11px] text-[#22d3ee] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              امروز
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-2 pt-1 border-t border-[#232834]">
              <div className="text-[11px] text-[#8b93a5]">
                روز هفته: <span className="text-[#22d3ee]">{result.dayOfWeekName}</span>
              </div>

              <div className="p-2 rounded bg-[#0d0f14] border border-[#232834]">
                <span className="text-[10px] text-[#8b93a5] block">خورشیدی (جلالی):</span>
                <span className="text-xs text-[#e6e9ef] font-mono-num block mt-0.5">
                  {result.jalali.formatted}
                </span>
              </div>

              <div className="p-2 rounded bg-[#0d0f14] border border-[#232834]">
                <span className="text-[10px] text-[#8b93a5] block">میلادی:</span>
                <span className="text-xs text-[#e6e9ef] font-mono-num block mt-0.5">
                  {result.gregorian.formatted}
                </span>
              </div>

              <div className="p-2 rounded bg-[#0d0f14] border border-[#232834]">
                <span className="text-[10px] text-[#8b93a5] block">هجری قمری:</span>
                <span className="text-xs text-[#e6e9ef] font-mono-num block mt-0.5">
                  {result.hijri.formatted}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="w-full py-2 rounded bg-[#0d0f14] hover:bg-[#1b202c] border border-[#232834] text-[#22d3ee] text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی نتیجه</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
