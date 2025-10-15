import type { ThemeState, ThemeType } from '@/shared/types/theme';
import { PersistedStore } from '$lib/stores/core/persisted-store.svelte';
import { STORAGES } from '@/shared/types/storage-key';
import { createRootEffect } from '$lib/stores/core/create-root-effect.svelte';

const getSystemTheme = (): ThemeState => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    theme: isDark ? 'dark' : 'light',
    shouldUseDarkColors: isDark,
    shouldUseHighContrastColors: false,
    shouldUseInvertedColorScheme: false
  };
};

/**
 * ThemeStore manages application theme state with persistence.
 *
 * Features:
 * - Light/Dark/System theme modes
 * - Automatic persistence to Electron storage
 * - Smooth theme transitions
 * - Native Electron theme integration
 * - DOM class updates
 *
 * @example
 * ```ts
 * // Access state
 * themeStore.isDark
 * themeStore.currentTheme
 *
 * // Actions
 * themeStore.toggle()
 * themeStore.setTheme('dark')
 * ```
 */
class ThemeStore {
  #persisted: PersistedStore<ThemeState>;

  constructor() {
    this.#persisted = new PersistedStore(STORAGES.APP_THEME_STATE, getSystemTheme());

    // Setup theme synchronization
    this.#setupThemeSync();
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get the full theme state
   */
  get state(): ThemeState {
    return this.#persisted.current;
  }

  /**
   * Update the full theme state
   */
  set state(newState: ThemeState) {
    this.#persisted.current = newState;
  }

  // ============================================================================
  // Theme Getters
  // ============================================================================

  /**
   * Get the current theme type
   */
  get currentTheme(): ThemeType {
    return this.state.theme;
  }

  /**
   * Check if dark mode is active
   */
  get isDark(): boolean {
    return this.state.shouldUseDarkColors;
  }

  /**
   * Check if light mode is active
   */
  get isLight(): boolean {
    return !this.state.shouldUseDarkColors;
  }

  // ============================================================================
  // Theme Actions
  // ============================================================================

  /**
   * Toggle between light and dark theme
   */
  toggle(): void {
    this.setTheme(this.isDark ? 'light' : 'dark');
  }

  /**
   * Set theme to a specific value
   * @param theme - Theme type to set
   */
  async setTheme(theme: ThemeType) {
    const currentState = this.state;
    const newState = {
      ...currentState,
      theme,
      shouldUseDarkColors: theme === 'system' ? currentState.shouldUseDarkColors : theme === 'dark'
    };

    await window.themeService.setTheme(newState.theme);
    this.state = newState;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Setup theme synchronization with Electron and DOM
   */
  #setupThemeSync(): void {
    createRootEffect(() => {
      const currentState = this.state;
      this.#applyThemeToDOM(currentState.shouldUseDarkColors);
    });
  }

  /**
   * Apply theme to DOM classes
   */
  #applyThemeToDOM(shouldApplyDark: boolean): void {
    const isDarkCurrentlyApplied = document.documentElement.classList.contains('dark');

    if (isDarkCurrentlyApplied !== shouldApplyDark) {
      if (shouldApplyDark) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Global theme store instance
 */
export const themeStore = new ThemeStore();
