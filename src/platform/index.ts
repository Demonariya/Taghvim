/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy } from 'react';
import { PlatformTarget } from './types.ts';

function resolveRuntimeTarget(): PlatformTarget {
  if (import.meta.env.MODE === 'android') {
    return 'android';
  }
  if (import.meta.env.MODE === 'windows') {
    return 'windows';
  }
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
    return 'android';
  }
  return 'windows';
}

export const ACTIVE_PLATFORM: PlatformTarget = resolveRuntimeTarget();

export function getActiveShellComponent(): React.LazyExoticComponent<React.ComponentType> {
  if (import.meta.env.MODE === 'android') {
    return lazy(() => import('./android/AndroidShell.tsx'));
  }
  if (import.meta.env.MODE === 'windows') {
    return lazy(() => import('./windows/WindowsShell.tsx'));
  }
  return ACTIVE_PLATFORM === 'android'
    ? lazy(() => import('./android/AndroidShell.tsx'))
    : lazy(() => import('./windows/WindowsShell.tsx'));
}
