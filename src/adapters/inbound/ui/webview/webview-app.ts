/**
 * Webview Application
 *
 * Main application logic for the webview UI. This file is bundled by esbuild
 * along with webview-entry.ts and exposes the UI components to the window object.
 *
 * The actual rendering is still done by the inline script (script.ts) during
 * the migration period. This module sets up additional component handlers.
 */

import { stateManager } from './state';
import { getSignal, resetAbortController } from './utils/events';

// Import component setup functions
import {
  setupHNFeedHandlers,
} from './components/waiting';

import {
  registerViewModeToggle,
  registerFeedToggle,
} from './components/diff';

// ===== Type Declarations =====

declare global {
  interface Window {
    SidecarApp: {
      initialize: () => void;
      stateManager: typeof stateManager;
    };
  }
}

// ===== VSCode API =====

interface VSCodeAPI {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
}

declare const acquireVsCodeApi: () => VSCodeAPI;

let vscode: VSCodeAPI | null = null;

function getVSCode(): VSCodeAPI {
  if (!vscode) {
    vscode = acquireVsCodeApi();
  }
  return vscode;
}

// ===== Initialize =====

/**
 * Initialize the webview application components.
 * Called after the DOM is ready.
 */
export function initialize(): void {
  const vsCodeApi = getVSCode();

  // Setup HN Feed handlers (registers window functions)
  setupHNFeedHandlers(vsCodeApi);

  // Setup view mode toggle (registers window function)
  registerViewModeToggle(() => {
    vsCodeApi.postMessage({ type: 'toggleDiffViewMode' });
  });

  // Setup feed toggle (registers window function)
  registerFeedToggle(() => {
    vsCodeApi.postMessage({ type: 'toggleFeed' });
  });

  console.log('[SidecarApp] Initialized');
}

// ===== Expose on Window =====

window.SidecarApp = {
  initialize,
  stateManager,
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM already loaded, initialize now
  initialize();
}
