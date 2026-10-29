/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isWebViewOutdated, getAndroidWebViewVersion } from './platform.ts';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

function renderFatalError(title: string, details: string) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div dir="rtl" style="position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:#07080b;color:#e6e9ef;font-family:'Digikala',sans-serif;">
      <div style="width:100%;max-width:420px;padding:24px;border-radius:16px;background:#14171f;border:1px solid rgba(239,68,68,0.3);text-align:center;">
        <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;color:#f87171;font-size:24px;font-weight:bold;">!</div>
        <h1 style="font-size:18px;font-weight:bold;color:#f87171;margin-bottom:12px;">${title}</h1>
        <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin-bottom:16px;">${details}</p>
        <button onclick="window.location.reload()" style="width:100%;padding:12px;border-radius:12px;background:#22d3ee;color:#07080b;font-weight:bold;border:none;cursor:pointer;">بارگذاری مجدد</button>
      </div>
    </div>
  `;
}

// Global unhandled error & rejection listeners
window.addEventListener('error', (event) => {
  console.error('Global window error:', event.error || event.message);
  if (!document.getElementById('root')?.hasChildNodes()) {
    renderFatalError('خطا در اجرای برنامه', event.message || 'خطای پیش‌بینی‌نشده‌ای در راه‌اندازی رخ داده است.');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Global unhandled rejection:', event.reason);
  if (!document.getElementById('root')?.hasChildNodes()) {
    const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
    renderFatalError('خطا در بارگذاری اولیه', msg || 'ارتباط با اجزای سیستمی برقرار نشد.');
  }
});

const rootElement = document.getElementById('root')!;

if (isWebViewOutdated()) {
  const currentVer = getAndroidWebViewVersion();
  createRoot(rootElement).render(
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-[#07080b] text-[#e6e9ef] font-['Digikala',sans-serif]"
    >
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#14171f] border border-amber-500/30 text-center shadow-2xl flex flex-col gap-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-amber-400">
          نیاز به به‌روزرسانی WebView اندروید
        </h1>
        <p className="text-sm text-[#9ca3af] leading-relaxed">
          نسخه مرورگر سیستمی (WebView) دستگاه شما قدیمی است {currentVer ? `(نسخه ${currentVer})` : ''}. تقویم برای اجرای ویژگی‌های نوین نیازمند حداقل نسخه ۱۱۱ است.
        </p>
        <p className="text-xs text-[#6b7280]">
          لطفاً برنامه <strong>Android System WebView</strong> یا <strong>Google Chrome</strong> را از طریق Google Play یا فروشگاه برنامه گوشی خود به‌روزرسانی کنید.
        </p>
      </div>
    </div>
  );
} else {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
