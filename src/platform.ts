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

// Set data-platform attribute on root <html> element immediately on script evaluation
if (typeof document !== 'undefined') {
  document.documentElement.dataset.platform = isAndroid ? 'android' : 'desktop';
}
