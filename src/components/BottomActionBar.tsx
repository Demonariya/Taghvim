import {
  Sparkles,
  CalendarCheck,
  Bell,
  Settings,
} from 'lucide-react';
import { isAndroid } from '../platform.ts';

interface BottomActionBarProps {
  onJumpToday: () => void;
  onOpenConverter: () => void;
  onOpenNotes: () => void;
  onOpenSettings: () => void;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  onJumpToday,
  onOpenConverter,
  onOpenNotes,
  onOpenSettings,
}) => {
  return (
    <div
      style={{
        paddingBottom: isAndroid ? 'env(safe-area-inset-bottom, 10px)' : undefined,
      }}
      className={`w-full bg-[#14171f] border-t border-[#232834] flex items-center justify-around px-2 shrink-0 select-none z-30 ${
        isAndroid ? 'min-h-[58px] py-1.5' : 'h-14'
      }`}
    >
      <button
        onClick={onJumpToday}
        className="flex flex-col items-center justify-center gap-1 text-[#8b93a5] hover:text-[#22d3ee] transition-colors cursor-pointer flex-1 py-1"
      >
        <Sparkles className="w-4 h-4 text-[#22d3ee]" />
        <span className="text-[11px]">امروز</span>
      </button>

      <button
        onClick={onOpenConverter}
        className="flex flex-col items-center justify-center gap-1 text-[#8b93a5] hover:text-[#22d3ee] transition-colors cursor-pointer flex-1 py-1"
      >
        <CalendarCheck className="w-4 h-4" />
        <span className="text-[11px]">تبدیل تاریخ</span>
      </button>

      <button
        onClick={onOpenNotes}
        className="flex flex-col items-center justify-center gap-1 text-[#8b93a5] hover:text-[#22d3ee] transition-colors cursor-pointer flex-1 py-1"
      >
        <Bell className="w-4 h-4" />
        <span className="text-[11px]">یادآورها</span>
      </button>

      <button
        onClick={onOpenSettings}
        className="flex flex-col items-center justify-center gap-1 text-[#8b93a5] hover:text-[#22d3ee] transition-colors cursor-pointer flex-1 py-1"
      >
        <Settings className="w-4 h-4" />
        <span className="text-[11px]">تنظیمات</span>
      </button>
    </div>
  );
};
