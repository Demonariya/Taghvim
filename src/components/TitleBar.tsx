import React from 'react';
import { Calendar } from 'lucide-react';
import { minimizeWindow, toggleMaximizeWindow, hideToTray } from '../services/tauriBridge.ts';
import { isAndroid } from '../platform.ts';

export const TitleBar: React.FC = () => {
  // Do not render custom title bar or window controls on Android
  if (isAndroid) {
    return null;
  }

  return (
    <div
      data-tauri-drag-region
      className="h-9 w-full bg-[#14171f] border-b border-[#232834] flex items-center justify-between px-3 select-none shrink-0 z-40"
    >
      {/* Right side in RTL: App icon & title */}
      <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
        <Calendar className="w-4 h-4 text-[#22d3ee]" />
        <span className="text-xs text-[#e6e9ef] tracking-wide">تقویم</span>
        <span className="text-[10px] text-[#8b93a5] px-1 rounded bg-[#0d0f14] border border-[#232834] font-mono-num">
          v0.0.1
        </span>
      </div>

      {/* Left side in RTL (window control buttons): Minimize, Maximize, Close */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => minimizeWindow()}
          title="کوچک‌سازی"
          className="w-7 h-7 flex items-center justify-center rounded text-[#8b93a5] hover:text-[#e6e9ef] hover:bg-[#1b202c] transition-colors cursor-pointer text-sm"
        >
          –
        </button>

        <button
          onClick={() => toggleMaximizeWindow()}
          title="بزرگ‌نمایی / بازگردانی"
          className="w-7 h-7 flex items-center justify-center rounded text-[#8b93a5] hover:text-[#e6e9ef] hover:bg-[#1b202c] transition-colors cursor-pointer text-xs"
        >
          ○
        </button>

        <button
          onClick={() => hideToTray()}
          title="بستن و انتقال به سینی ویندوز"
          className="w-7 h-7 flex items-center justify-center rounded text-[#8b93a5] hover:text-white hover:bg-[#ef4444] transition-colors cursor-pointer text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
