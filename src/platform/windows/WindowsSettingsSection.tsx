/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Power, Keyboard } from 'lucide-react';
import { AppSettings } from '../../shared/types/calendar.ts';

interface WindowsSettingsSectionProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const WindowsSettingsSection: React.FC<WindowsSettingsSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="space-y-3">
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

      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834]">
        <div className="flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-[#8b93a5]" />
          <span className="text-[11px] text-[#8b93a5]">میانبر باز/بستن برنامه:</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#14171f] border border-[#232834] text-[#22d3ee] text-[11px] font-mono-num">
          {settings.globalShortcut}
        </span>
      </div>
    </div>
  );
};
