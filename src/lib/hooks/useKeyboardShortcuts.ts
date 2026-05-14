/**
 * Keyboard Shortcuts Hook
 * Provides centralized keyboard shortcut management for HyperFlow
 */

import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
}

export interface KeyboardShortcuts {
  openCommandBar: () => void;
  openHistory: () => void;
  openSettings: () => void;
  closeModal: () => void;
  confirm: () => void;
  navigateUp?: () => void;
  navigateDown?: () => void;
  navigateLeft?: () => void;
  navigateRight?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Command/Ctrl + K: Open command bar
      if (modKey && event.key === 'k') {
        event.preventDefault();
        shortcuts.openCommandBar();
        return;
      }

      // Command/Ctrl + H: Open history
      if (modKey && event.key === 'h') {
        event.preventDefault();
        shortcuts.openHistory();
        return;
      }

      // Command/Ctrl + ,: Open settings
      if (modKey && event.key === ',') {
        event.preventDefault();
        shortcuts.openSettings();
        return;
      }

      // Escape: Close modal
      if (event.key === 'Escape') {
        shortcuts.closeModal();
        return;
      }

      // Enter: Confirm action
      if (event.key === 'Enter') {
        shortcuts.confirm();
        return;
      }

      // Arrow navigation
      if (event.key === 'ArrowUp' && shortcuts.navigateUp) {
        event.preventDefault();
        shortcuts.navigateUp();
        return;
      }

      if (event.key === 'ArrowDown' && shortcuts.navigateDown) {
        event.preventDefault();
        shortcuts.navigateDown();
        return;
      }

      if (event.key === 'ArrowLeft' && shortcuts.navigateLeft) {
        event.preventDefault();
        shortcuts.navigateLeft();
        return;
      }

      if (event.key === 'ArrowRight' && shortcuts.navigateRight) {
        event.preventDefault();
        shortcuts.navigateRight();
        return;
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Helper to format shortcut display
export function formatShortcut(key: string, modifiers: string[] = []): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const parts = [...modifiers.map((m) => (m === 'mod' ? modKey : m)), key];
  return parts.join(' + ');
}

// Common shortcuts configuration
export const SHORTCUTS = {
  COMMAND_BAR: { key: 'K', modifiers: ['mod'], label: 'Open command bar' },
  HISTORY: { key: 'H', modifiers: ['mod'], label: 'View history' },
  SETTINGS: { key: ',', modifiers: ['mod'], label: 'Open settings' },
  ESCAPE: { key: 'Esc', modifiers: [], label: 'Close / Clear' },
  ENTER: { key: 'Enter', modifiers: [], label: 'Continue / Confirm' },
  NAVIGATE_UP: { key: '↑', modifiers: [], label: 'Navigate up' },
  NAVIGATE_DOWN: { key: '↓', modifiers: [], label: 'Navigate down' },
} as const;
