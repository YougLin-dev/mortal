import { i18nStore } from './i18n.store.svelte';
import enMessages from './locales/en';

/**
 * Initialize the i18n system
 * This function should be called once at application startup
 *
 * Features:
 * - Registers all available locales
 * - Sets up lazy loading for non-default locales
 * - Detects browser language automatically
 * - Falls back to English if detection fails
 *
 * @example
 * ```ts
 * // In main.ts
 * import { initI18n } from '$lib/i18n/init';
 *
 * initI18n();
 * ```
 */
export function initI18n(): void {
  // Register default locale (English) - preloaded
  i18nStore.addMessages('en', enMessages);

  // Register other locales with lazy loading
  // These will only be loaded when the user switches to them
  i18nStore.register('zh', () => import('./locales/zh'));
  i18nStore.register('ja', () => import('./locales/ja'));
}
