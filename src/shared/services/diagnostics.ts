/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StartupDiagnosticsReport } from '../types/calendar.ts';

export interface FrontendBootStage {
  stage: string;
  detail: string;
  elapsedMs: number;
}

export interface FrontendBootTrace {
  startedAt: number;
  reactMounted: boolean;
  stages: FrontendBootStage[];
  errors: string[];
}

declare global {
  interface Window {
    __TAGHVIM_BOOT__?: FrontendBootTrace;
    __taghvimRecordStage?: (stage: string, detail?: string) => void;
  }
}

export function recordFrontendStage(stage: string, detail?: string): void {
  if (typeof window === 'undefined') return;
  if (typeof window.__taghvimRecordStage === 'function') {
    window.__taghvimRecordStage(stage, detail);
    return;
  }
  const trace = (window.__TAGHVIM_BOOT__ ??= {
    startedAt: Date.now(),
    reactMounted: false,
    stages: [],
    errors: [],
  });
  trace.stages.push({
    stage,
    detail: detail ?? '',
    elapsedMs: Date.now() - trace.startedAt,
  });
}

export function markReactMounted(): void {
  if (typeof window === 'undefined') return;
  if (window.__TAGHVIM_BOOT__) {
    window.__TAGHVIM_BOOT__.reactMounted = true;
  }
  recordFrontendStage('react_mounted');
}

export function getFrontendBootTrace(): FrontendBootTrace | null {
  if (typeof window === 'undefined') return null;
  return window.__TAGHVIM_BOOT__ ?? null;
}

export async function fetchRustStartupDiagnostics(): Promise<StartupDiagnosticsReport | null> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return null;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<StartupDiagnosticsReport>('get_startup_diagnostics');
  } catch (err) {
    console.warn('[Diagnostics] Failed to fetch Rust startup diagnostics:', err);
    return null;
  }
}
