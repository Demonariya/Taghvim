import React, { useState } from 'react';
import {
  X,
  Settings,
  RefreshCw,
  Power,
  Calendar,
  Eye,
  Bell,
  Keyboard,
  Info,
} from 'lucide-react';
import { AppSettings } from '../types/calendar.ts';
import { toFa } from '../utils/persianDate.ts';
import { isAndroid } from '../platform.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onRefreshCache: () => Promise<void>;
  isOffline: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRefreshCache,
  isOffline,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      await onRefreshCache();
      setRefreshMsg('کش مناسبت‌ها با موفقیت بروزرسانی شد.');
    } catch {
      setRefreshMsg('خطا در دریافت اطلاعات جدید.');
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(''), 4000);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 select-none ${
        isAndroid ? 'dialog-overlay' : ''
      }`}
    >
      <div
        className={`relative w-full max-w-[360px] bg-[#14171f] border border-[#232834] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] ${
          isAndroid ? 'dialog-sheet' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#232834] bg-[#0d0f14] shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#22d3ee]" />
            <h3 className="text-xs text-[#e6e9ef]">تنظیمات برنامه</h3>
            <span className="text-[10px] text-[#8b93a5] px-1 rounded bg-[#14171f] border border-[#232834] font-mono-num">
              v0.0.1
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="بستن"
            className="p-1 rounded text-[#8b93a5] hover:text-[#e6e9ef] hover:bg-[#1b202c] transition-colors cursor-pointer touch-target-48 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body: NEVER cut off */}
        <div className="p-3 overflow-y-auto flex-1 space-y-3 text-xs">
          {/* Status and time.ir Cache */}
          <div className="p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8b93a5]">منبع داده time.ir:</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isOffline
                    ? 'border border-[#ef4444]/40 text-[#ef4444]'
                    : 'border border-[#22d3ee]/40 text-[#22d3ee]'
                }`}
              >
                {isOffline ? 'آفلاین' : 'آنلاین (متصل)'}
              </span>
            </div>

            {settings.lastError && (
              <div className="text-[10px] text-[#ef4444] bg-[#14171f] p-1.5 rounded border border-[#ef4444]/20 leading-normal">
                پیام آخرین خطا: {settings.lastError}
              </div>
            )}

            <div className="text-[10px] text-[#8b93a5] flex items-center justify-between pt-1 border-t border-[#232834]">
              <span>آخرین بررسی کش:</span>
              <span className="font-mono-num text-[#e6e9ef]">
                {settings.lastCacheSync
                  ? toFa(new Date(settings.lastCacheSync).toLocaleTimeString('fa-IR'))
                  : 'امروز'}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full mt-1 py-1.5 rounded bg-[#14171f] hover:bg-[#1b202c] border border-[#232834] text-[#22d3ee] text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 touch-target-48"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'در حال دریافت...' : 'بروزرسانی داده‌های ماه'}</span>
            </button>

            {refreshMsg && (
              <p className="text-[10px] text-emerald-400 text-center">{refreshMsg}</p>
            )}
          </div>

          {/* Autostart Toggle - Desktop Only */}
          {!isAndroid && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834]">
              <div className="flex items-center gap-2">
                <Power className="w-3.5 h-3.5 text-[#22d3ee]" />
                <div>
                  <span className="text-xs text-[#e6e9ef] block">
                    شروع خودکار با ویندوز
                  </span>
                  <span className="text-[10px] text-[#8b93a5]">
                    اجرای نرم‌افزار در سینی سیستم هنگام شروع
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autostart}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, autostart: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#232834] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22d3ee]"></div>
              </label>
            </div>
          )}

          {/* First day of week */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834]">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#22d3ee]" />
              <div>
                <span className="text-xs text-[#e6e9ef] block">روز اول هفته</span>
                <span className="text-[10px] text-[#8b93a5]">شنبه (رسمی ایران) یا یکشنبه</span>
              </div>
            </div>

            <select
              value={settings.firstDayOfWeek}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  firstDayOfWeek: parseInt(e.target.value, 10) as 0 | 1,
                })
              }
              className="bg-[#14171f] border border-[#232834] text-[#e6e9ef] text-xs rounded px-2 py-1 focus:border-[#22d3ee] outline-none"
            >
              <option value={0}>شنبه</option>
              <option value={1}>یکشنبه</option>
            </select>
          </div>

          {/* Secondary dates */}
          <div className="p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834] space-y-2">
            <div className="text-[11px] text-[#8b93a5] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#22d3ee]" />
              نمایش تقویم‌های جانبی:
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-[#e6e9ef] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showGregorian}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showGregorian: e.target.checked })
                  }
                  className="rounded accent-[#22d3ee]"
                />
                <span>میلادی</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-[#e6e9ef] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showHijri}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showHijri: e.target.checked })
                  }
                  className="rounded accent-[#22d3ee]"
                />
                <span>قمری</span>
              </label>
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834]">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[#22d3ee]" />
              <div>
                <span className="text-xs text-[#e6e9ef] block">
                  {isAndroid ? 'اعلان‌ها و یادآورها' : 'اعلان‌های بومی ویندوز'}
                </span>
                <span className="text-[10px] text-[#8b93a5]">
                  {isAndroid
                    ? 'ارسال اعلان یادآوری رویدادها و یادداشت‌ها'
                    : 'ارسال اعلان حتی هنگام پنهان بودن پنجره'}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    enableNotifications: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#232834] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22d3ee]"></div>
            </label>
          </div>

          {/* Android-specific Notification & Alarm Note */}
          {isAndroid && (
            <div className="p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834] flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#22d3ee] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#8b93a5] leading-relaxed">
                در اندروید، برای دریافت دقیق اعلان‌ها در زمان مشخص‌شده، دسترسی اعلان‌ها (POST_NOTIFICATIONS) را تأیید کرده و در تنظیمات دستگاه، بهینه‌سازی باتری (Battery Saver) را برای تقویم غیرفعال کنید.
              </p>
            </div>
          )}

          {/* Shortcut info - Desktop Only */}
          {!isAndroid && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834]">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-[#8b93a5]" />
                <span className="text-[11px] text-[#8b93a5]">میانبر باز/بستن برنامه:</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#14171f] border border-[#232834] text-[#22d3ee] text-[11px] font-mono-num">
                {settings.globalShortcut}
              </span>
            </div>
          )}

          {/* App Info footer */}
          <div className="text-center pt-1 text-[10px] text-[#8b93a5]">
            Taghvim {isAndroid ? 'Android' : 'Desktop'} • نسخه {toFa('0.0.1')}
          </div>
        </div>
      </div>
    </div>
  );
};
