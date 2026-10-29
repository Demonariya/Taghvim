/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Platform detection helper.
 * Uses navigator.userAgent to detect Android synchronously and without runtime dependencies,
 * ensuring immediate availability before any React rendering or DOM hydration.
 */
function detectIsAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android/.test(ua);
}

export const isAndroid: boolean = detectIsAndroid();
export const isDesktop: boolean = !isAndroid;

/**
 * Extracts Chrome/WebView major version from User Agent.
 */
export function getAndroidWebViewVersion(): number | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const match = ua.match(/Chrome\/(\d+)/i) || ua.match(/Version\/(\d+)/i);
  if (match && match[1]) {
    const version = parseInt(match[1], 10);
    return isNaN(version) ? null : version;
  }
  return null;
}

/**
 * Checks if the current Android System WebView is older than Chrome 111.
 * Tailwind 4 and Vite 8 modern ES features require at least Chromium 111.
 */
export function isWebViewOutdated(): boolean {
  if (!isAndroid) return false;
  const ver = getAndroidWebViewVersion();
  return ver !== null && ver < 111;
}

// Set data-platform attribute on root <html> element immediately on script evaluation
if (typeof document !== 'undefined') {
  document.documentElement.dataset.platform = isAndroid ? 'android' : 'desktop';
}
