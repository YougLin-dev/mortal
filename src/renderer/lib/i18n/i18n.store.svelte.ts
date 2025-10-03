/* eslint-disable @typescript-eslint/no-explicit-any */
import { PersistedStore } from '$lib/stores/core/persisted-store.svelte';
import { createRootEffect } from '$lib/stores/core/create-root-effect.svelte';
import { STORAGES } from '@/shared/types/storage-key';
import type { TranslateFn, Path, Widen } from './types';
import enMessages from './locales/en';
import { isDev } from '$lib/utils';
import { SUPPORTED_LOCALES } from '.';

// Infer the Messages type from the default locale
export type Messages = Widen<typeof enMessages>;
type MessageKey = Path<Messages>;
type Loader = () => Promise<{ default: Messages }>;

/**
 * I18nStore manages application internationalization with type-safe translations.
 *
 * Features:
 * - Type-safe translation keys with autocomplete
 * - Parameter interpolation with type checking
 * - Automatic persistence to Electron storage
 * - Lazy loading for non-default locales
 * - Deep merging with fallback locale
 * - Browser locale detection
 *
 * @example
 * ```ts
 * // Simple translation
 * i18nStore.t('common.welcome')
 *
 * // With parameters (type-safe)
 * i18nStore.t('common.welcomeUser', { name: 'Alice' })
 *
 * // Change locale
 * i18nStore.locale = 'zh'
 *
 * // Check loading state
 * if (i18nStore.isLoading) { ... }
 * ```
 */
class I18nStore {
  #persisted: PersistedStore<string>;
  #localeMap: Map<string, Messages | Loader> = new Map();
  #fallbackDict: Messages = enMessages;
  #currentDict = $state<Messages>(enMessages);
  #mergedDict = $state<Messages>(enMessages);
  #isLoading = $state(false);

  constructor() {
    this.#persisted = new PersistedStore(STORAGES.APP_I18N_LOCALE, window.locale);

    // Setup locale synchronization
    createRootEffect(() => {
      const locale = this.#persisted.current;
      this.#loadLocale(locale);
    });
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get current locale code
   */
  get locale(): string {
    return this.#persisted.current;
  }

  /**
   * Set current locale code and trigger loading
   */
  set locale(code: string) {
    if (this.#localeMap.has(code)) {
      this.#persisted.current = code;
    } else {
      console.warn(`[i18n] Locale "${code}" not registered`);
    }
  }

  get displayText(): string {
    const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === this.locale);
    if (!localeInfo) return this.locale;
    return `${localeInfo.flag} ${localeInfo.nativeName}`;
  }
  /**
   * Check if translations are currently loading
   */
  get isLoading(): boolean {
    return this.#isLoading;
  }

  /**
   * Get list of all available locale codes
   */
  get availableLocales(): string[] {
    return Array.from(this.#localeMap.keys());
  }

  // ============================================================================
  // Translation Method
  // ============================================================================

  /**
   * Translate a key with optional parameters
   * @param key - Translation key (dot-notation path)
   * @param params - Optional parameters for interpolation
   * @returns Translated string with interpolated parameters
   */
  t: TranslateFn<Messages> = (key: MessageKey, params?) => {
    const value = this.#getNestedValue(this.#mergedDict, key);

    if (typeof value !== 'string') {
      if (isDev) {
        console.warn(`[i18n] Translation key "${key}" not found or not a string`);
      }
      return key;
    }

    // If no parameters provided, return the value as-is
    if (!params) {
      return value;
    }

    // Interpolate parameters into the string
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      const replacement = params[paramKey];
      return replacement !== undefined && replacement !== null ? String(replacement) : match;
    });
  };

  // ============================================================================
  // Registration Methods
  // ============================================================================

  /**
   * Register a locale with preloaded messages
   * @param code - Locale code (e.g., 'en', 'zh', 'ja')
   * @param messages - Translation messages object
   */
  addMessages(code: string, messages: Messages): void {
    this.#localeMap.set(code, messages);
  }

  /**
   * Register a locale with lazy loading
   * @param code - Locale code (e.g., 'en', 'zh', 'ja')
   * @param loader - Function that returns a promise resolving to messages
   */
  register(code: string, loader: Loader): void {
    this.#localeMap.set(code, loader);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Format a date according to current locale
   * @param date - Date to format
   * @param options - Intl.DateTimeFormat options
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale, options).format(date);
  }

  /**
   * Format a number according to current locale
   * @param num - Number to format
   * @param options - Intl.NumberFormat options
   */
  formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(num);
  }

  /**
   * Format a currency amount according to current locale
   * @param amount - Amount to format
   * @param currency - Currency code (e.g., 'USD', 'EUR')
   */
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency
    }).format(amount);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load a locale and merge with fallback
   */
  async #loadLocale(code: string): Promise<void> {
    this.#isLoading = true;

    try {
      const entry = this.#localeMap.get(code);

      if (!entry) {
        console.warn(`[i18n] Locale "${code}" not found, using fallback`);
        this.#currentDict = this.#fallbackDict;
        this.#merge();
        return;
      }

      // If it's a loader function, execute lazy loading
      if (typeof entry === 'function') {
        const module = await entry();
        const messages = module.default;
        this.#localeMap.set(code, messages); // Cache the loaded messages
        this.#currentDict = messages;
      } else {
        this.#currentDict = entry;
      }

      this.#merge();
    } catch (error) {
      console.error(`[i18n] Failed to load locale "${code}":`, error);
      this.#currentDict = this.#fallbackDict;
      this.#merge();
    } finally {
      this.#isLoading = false;
    }
  }

  /**
   * Deep merge current dictionary with fallback
   * Missing keys in current locale will fall back to default locale
   */
  #merge(): void {
    const result = structuredClone(this.#fallbackDict);

    const deepMerge = (target: Messages, source: Messages) => {
      for (const key in source) {
        const sourceValue = source[key];
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          deepMerge(target[key], sourceValue);
        } else {
          target[key] = sourceValue;
        }
      }
    };

    deepMerge(result, this.#currentDict);
    this.#mergedDict = result;
  }

  /**
   * Get nested value from object by dot-notation path
   * @param obj - Object to traverse
   * @param path - Dot-notation path (e.g., 'common.welcome')
   */
  #getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Global i18n store instance
 */
export const i18nStore = new I18nStore();
