/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isTauri } from '../../shared/services/storageService.ts';
import { recordFrontendStage } from '../../shared/services/diagnostics.ts';

async function callDesktopCommand<T>(cmd: string): Promise<T | undefined> {
  if (!isTauri()) return undefined;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd);
}

export async function minimizeWindow(): Promise<void> {
  try {
    await callDesktopCommand('minimize_window');
  } catch (err) {
    console.warn('[Windows] minimize_window failed:', err);
  }
}

export async function toggleMaximizeWindow(): Promise<void> {
  try {
    await callDesktopCommand('toggle_maximize_window');
  } catch (err) {
    console.warn('[Windows] toggle_maximize_window failed:', err);
  }
}

export async function hideToTray(): Promise<void> {
  try {
    await callDesktopCommand('hide_to_tray');
  } catch (err) {
    console.warn('[Windows] hide_to_tray failed:', err);
  }
}

export async function openMainWindow(): Promise<void> {
  try {
    if (isTauri()) {
      await callDesktopCommand('open_main_window');
      return;
    }
  } catch (err) {
    console.warn('[Windows] open_main_window failed:', err);
  }
  if (typeof window !== 'undefined') {
    window.location.hash = '';
  }
}

export async function syncWindowsAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  try {
    const { enable, disable, isEnabled } = await import('@tauri-apps/plugin-autostart');
    const current = await isEnabled();
    if (enabled && !current) {
      await enable();
    } else if (!enabled && current) {
      await disable();
    }
  } catch (err) {
    console.warn('[Windows] Failed syncing autostart state:', err);
  }
}

export async function sendWindowsNotification(title: string, body: string): Promise<void> {
  if (isTauri()) {
    try {
      const {
        isPermissionGranted,
        requestPermission,
        sendNotification: tauriNotify,
      } = await import('@tauri-apps/plugin-notification');
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        tauriNotify({ title, body });
        return;
      }
    } catch (err) {
      console.warn('[Windows] Tauri notification plugin error:', err);
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

export function subscribeTrayJumpToday(handler: () => void): () => void {
  const domListener = () => handler();
  window.addEventListener('taghvim-jump-today', domListener);

  let tauriUnlisten: (() => void) | undefined;
  let disposed = false;

  if (isTauri()) {
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen('taghvim-jump-today', handler))
      .then((cleanup) => {
        if (disposed) {
          cleanup();
        } else {
          tauriUnlisten = cleanup;
        }
      })
      .catch((err) => {
        console.warn('[Windows] Tray listener registration error:', err);
      });
  }

  return () => {
    disposed = true;
    window.removeEventListener('taghvim-jump-today', domListener);
    if (tauriUnlisten) tauriUnlisten();
  };
}

export function markWindowsPlatformActive(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.platform = 'windows';
  }
  recordFrontendStage('windows_adapter_initialized');
}
