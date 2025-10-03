/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Path, NamespacedTranslateFn } from './types';
import { i18nStore } from './i18n.store.svelte';
import enMessages from './locales/en';

type Messages = typeof enMessages;

/**
 * Create a namespaced translation function
 * This reduces repetition when translating multiple keys from the same namespace
 *
 * @param prefix - The namespace prefix (e.g., 'chat', 'settings.theme', 'test')
 * @returns A translation function scoped to the namespace with type-safe key suggestions
 *
 * @example
 * ```ts
 * const tChat = createNamespacedT('chat');
 * tChat('title');       // ✅ Equivalent to i18nStore.t('chat.title')
 * tChat('newChat');     // ✅ Equivalent to i18nStore.t('chat.newChat')
 * tChat('placeholder'); // ✅ Equivalent to i18nStore.t('chat.placeholder')
 *
 * // With parameters (type-safe)
 * const tTest = createNamespacedT('test');
 * tTest('messages.multiplyResult', { a: 7, b: 8, result: 56 });
 *
 * // Type errors
 * tChat('test.title');     // ❌ Not in 'chat' namespace
 * tChat('common.welcome'); // ❌ Not in 'chat' namespace
 * ```
 */
export function createNamespacedT<Prefix extends Path<Messages>>(prefix: Prefix): NamespacedTranslateFn<Messages, Prefix> {
  return ((key: string, params?: any): string => {
    const fullKey = `${prefix}.${key}` as Path<Messages>;
    return i18nStore.t(fullKey as any, params as any);
  }) as NamespacedTranslateFn<Messages, Prefix>;
}

/**
 * Translation with pluralization support
 * Expects keys in the format: {baseKey}_zero, {baseKey}_one, {baseKey}_other
 *
 * @param baseKey - Base translation key
 * @param count - The count to determine plural form
 * @param params - Additional parameters for interpolation
 * @returns Translated string with correct plural form
 *
 * @example
 * ```ts
 * // Translation files should have:
 * // items_zero: "No items"
 * // items_one: "1 item"
 * // items_other: "{count} items"
 *
 * tPlural('items', 0);   // "No items"
 * tPlural('items', 1);   // "1 item"
 * tPlural('items', 5);   // "5 items"
 * ```
 */
export function tPlural(baseKey: string, count: number, params?: Record<string, string | number>): string {
  const pluralKey = count === 0 ? `${baseKey}_zero` : count === 1 ? `${baseKey}_one` : `${baseKey}_other`;

  return i18nStore.t(pluralKey as any, { count, ...params });
}

/**
 * Check if a key exists in the current locale
 *
 * @param key - Translation key to check
 * @returns True if the key exists
 *
 * @example
 * ```ts
 * if (hasKey('common.welcome')) {
 *   console.log('Key exists');
 * }
 * ```
 */
export function hasKey(key: Path<Messages>): boolean {
  const keys = key.split('.');
  let current: any = enMessages;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return false;
    }
  }

  return typeof current === 'string';
}

/**
 * Get all translation keys as an array
 * Useful for debugging or building dynamic UIs
 *
 * @param prefix - Optional prefix to filter keys
 * @returns Array of translation keys
 *
 * @example
 * ```ts
 * getAllKeys();              // ['common.welcome', 'common.settings', ...]
 * getAllKeys('chat');        // ['chat.title', 'chat.newChat', ...]
 * ```
 */
export function getAllKeys(prefix?: string): string[] {
  const keys: string[] = [];

  function traverse(obj: any, path: string = '') {
    for (const key in obj) {
      const newPath = path ? `${path}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key], newPath);
      } else if (typeof obj[key] === 'string') {
        keys.push(newPath);
      }
    }
  }

  traverse(enMessages);

  if (prefix) {
    return keys.filter((key) => key.startsWith(prefix));
  }

  return keys;
}
