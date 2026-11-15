/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { recordFrontendStage } from './shared/services/diagnostics.ts';
import './index.css';

recordFrontendStage('main_tsx_executing');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root mount element #root not found in index.html');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
