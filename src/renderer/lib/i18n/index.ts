/**
 * I18n (Internationalization) module
 *
 * This module provides a complete type-safe internationalization solution
 * for the application using Svelte 5 runes.
 *
 * @example
 * ```ts
 * import { i18nStore, t } from '$lib/i18n';
 *
 * // Option 1: Use store directly
 * i18nStore.t('common.welcome');
 *
 * // Option 2: Use shorthand t() function
 * t('common.welcome');
 * t('common.welcomeUser', { name: 'Alice' });
 *
 * // Change locale
 * i18nStore.locale = 'zh';
 * ```
 */

// Core exports
export { i18nStore } from './i18n.store.svelte';
export { initI18n } from './init';

// Helper functions
export { createNamespacedT, tPlural, hasKey, getAllKeys } from './helpers';

// Type exports
export type { Path, PathValue, TranslateFn, Dictionary } from './types';
export { SUPPORTED_LOCALES, type LocaleCode, type LocaleInfo } from '@/shared/types/i18n';

// Locale exports (for direct usage if needed)
export { default as enMessages } from './locales/en';

// ============================================================================
// Convenience export: shorthand t() function
// ============================================================================

import { i18nStore } from './i18n.store.svelte';

/**
 * Shorthand translation function
 * Equivalent to i18nStore.t() but shorter to type
 *
 * @example
 * ```ts
 * import { t } from '$lib/i18n';
 *
 * t('common.welcome')
 * t('common.welcomeUser', { name: 'Alice' })
 * ```
 */
export const t = i18nStore.t.bind(i18nStore);
