/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { WindowsShell } from './platform/windows/WindowsShell.tsx';
import { markReactMounted, recordFrontendStage } from './shared/services/diagnostics.ts';

export default function App() {
  useEffect(() => {
    markReactMounted();
    recordFrontendStage('app_shell_mounted');
  }, []);

  return <WindowsShell />;
}
