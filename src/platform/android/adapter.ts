/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isTauri } from '../../shared/services/storageService.ts';
import { recordFrontendStage } from '../../shared/services/diagnostics.ts';

export function getAndroidWebViewVersion(): number | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const match = ua.match(/Chrome\/(\d+)/i) || ua.match(/Version\/(\d+)/i);
  if (match && match[1]) {
    const version = parseInt(match[1], 10);
    return Number.isNaN(version) ? null : version;
  }
  return null;
}

export function isWebViewOutdated(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!/android/i.test(navigator.userAgent)) return false;
  const ver = getAndroidWebViewVersion();
  return ver !== null && ver < 111;
}

export async function requestAndroidNotificationPermission(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { isPermissionGranted, requestPermission } = await import(
      '@tauri-apps/plugin-notification'
    );
    const granted = await isPermissionGranted();
    if (!granted) {
      await requestPermission();
    }
  } catch (err) {
    console.warn('[Android] Notification permission request error:', err);
  }
}

export async function sendAndroidNotification(title: string, body: string): Promise<void> {
  if (isTauri()) {
    try {
      const {
        isPermissionGranted,
        requestPermission,
        sendNotification: tauriNotify,
      } = await import('@tauri-apps/plugin-notification');

      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      if (granted) {
        tauriNotify({ title, body });
        return;
      }
      console.warn('[Android] Notification permission not granted.');
      return;
    } catch (err) {
      console.warn('[Android] Tauri notification plugin error:', err);
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}

export function markAndroidPlatformActive(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.platform = 'android';
  }
  recordFrontendStage('android_adapter_initialized', `webview=${getAndroidWebViewVersion() ?? 'unknown'}`);
}
