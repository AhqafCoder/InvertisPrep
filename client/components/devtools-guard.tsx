'use client';

import { useEffect } from 'react';

/**
 * Global "deterrence" guard against casual source inspection.
 *
 * Blocks the common paths to DevTools and page source (F12, Ctrl/Cmd+Shift+
 * I/J/C, Ctrl/Cmd+U) and disables the right-click context menu — except on
 * editable fields, where the context menu is the primary paste/edit affordance.
 *
 * Deliberately NOT included: devtools-open detection (screen-size deltas,
 * debugger-timing traps). Those heuristics misfire on zoom, docked toolbars,
 * small screens and some extensions, and would punish real users.
 *
 * Like all client-side guards this is deterrence, not DRM — determined users
 * can always bypass it. The real mitigations are server-side: watermarked,
 * authenticated PDF endpoints and no browser source maps in production.
 */
export function DevtoolsGuard() {
  useEffect(() => {
    // Dev convenience: never interfere while developing.
    if (process.env.NODE_ENV !== 'production') return;

    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable === true
      );
    };

    const isShortcutCombo = (e: KeyboardEvent): boolean => {
      const key = e.key;
      const mod = e.ctrlKey || e.metaKey;
      // F12 opens devtools directly.
      if (key === 'F12') return true;
      // Ctrl/Cmd+Shift+I = inspect, +J = console, +C = view selected source.
      if (mod && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'i' || key === 'j' || key === 'c')) return true;
      // Ctrl/Cmd+U = view-source.
      if (mod && (key === 'u' || key === 'U')) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isShortcutCombo(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      // Keep the native menu on editable fields (paste, spellcheck, etc.)
      if (isEditable(e.target)) return;
      e.preventDefault();
    };

    // Capture phase so the guard runs before any page-level handlers.
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  return null;
}
