/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect } from 'react';
import { getActiveShellComponent } from './platform/index.ts';
import { markReactMounted, recordFrontendStage } from './shared/services/diagnostics.ts';

const PlatformShell = getActiveShellComponent();

const BootFallback: React.FC = () => (
  <div
    dir="rtl"
    className="w-screen h-screen bg-[#0d0f14] text-[#8b93a5] flex items-center justify-center text-xs select-none"
  >
    در حال بارگذاری تقویم...
  </div>
);

export default function App() {
  useEffect(() => {
    markReactMounted();
    recordFrontendStage('app_shell_mounted');
  }, []);

  return (
    <Suspense fallback={<BootFallback />}>
      <PlatformShell />
    </Suspense>
  );
}
