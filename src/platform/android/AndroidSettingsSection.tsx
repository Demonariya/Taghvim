/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Info, Activity } from 'lucide-react';
import { StartupDiagnosticsReport } from '../../shared/types/calendar.ts';
import {
  fetchRustStartupDiagnostics,
  getFrontendBootTrace,
} from '../../shared/services/diagnostics.ts';
import { getAndroidWebViewVersion } from './adapter.ts';

export const AndroidSettingsSection: React.FC = () => {
  const [showDiag, setShowDiag] = useState(false);
  const [rustDiag, setRustDiag] = useState<StartupDiagnosticsReport | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  const handleToggleDiagnostics = async () => {
    const next = !showDiag;
    setShowDiag(next);
    if (next && !rustDiag) {
      setLoadingDiag(true);
      const report = await fetchRustStartupDiagnostics();
      setRustDiag(report);
      setLoadingDiag(false);
    }
  };

  const bootTrace = getFrontendBootTrace();
  const webViewVersion = getAndroidWebViewVersion();

  return (
    <div className="space-y-2">
      <div className="p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834] flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-[#22d3ee] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#8b93a5] leading-relaxed">
          در اندروید، برای دریافت دقیق اعلان‌ها در زمان مشخص‌شده، دسترسی اعلان‌ها (POST_NOTIFICATIONS) را تأیید کرده و در تنظیمات دستگاه، بهینه‌سازی باتری (Battery Saver) را برای تقویم غیرفعال کنید.
        </p>
      </div>

      <div className="p-2.5 rounded-lg bg-[#0d0f14] border border-[#232834] space-y-2">
        <button
          type="button"
          onClick={handleToggleDiagnostics}
          className="w-full flex items-center justify-between text-[11px] text-[#22d3ee] cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            گزارش عیب‌یابی راه‌اندازی اندروید
          </span>
          <span className="text-[10px] text-[#8b93a5]">
            {showDiag ? 'بستن' : 'نمایش'}
          </span>
        </button>

        {showDiag && (
          <div dir="ltr" className="text-[10px] font-mono-num bg-[#07080b] border border-[#232834] rounded p-2 space-y-1.5 text-left max-h-48 overflow-y-auto select-text">
            <div className="text-[#22d3ee]">
              WebView Major: {webViewVersion ?? 'N/A'} | React Mounted: {bootTrace?.reactMounted ? 'yes' : 'no'}
            </div>
            {loadingDiag && <div className="text-[#8b93a5]">Loading native diagnostics...</div>}
            {rustDiag && (
              <>
                <div className="text-[#8b93a5]">
                  Data Dir: {rustDiag.appDataDir ?? 'unavailable'}
                </div>
                {rustDiag.errors.length > 0 && (
                  <div className="text-[#ef4444]">
                    Native Errors: {rustDiag.errors.join(' | ')}
                  </div>
                )}
                <div className="text-[#e6e9ef]">
                  Native Stages: {rustDiag.stages.map((s) => `${s.stage}(${s.status})`).join(' -> ')}
                </div>
              </>
            )}
            {bootTrace && (
              <div className="text-[#8b93a5]">
                JS Stages: {bootTrace.stages.map((s) => `${s.stage}@${s.elapsedMs}ms`).join(' -> ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
