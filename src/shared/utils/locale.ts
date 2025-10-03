import { app } from 'electron';
import { SUPPORTED_LOCALES } from '@/shared/types/i18n';

export function detectAppLocale(fallback: string = 'en'): string {
  const appLang = app.getLocale();
  const availableLocales = SUPPORTED_LOCALES.map((locale) => locale.code as string);

  // Exact match (e.g., 'en-US' === 'en-US')
  if (availableLocales.includes(appLang)) {
    return appLang;
  }

  // Language code match (e.g., 'en-US' -> 'en')
  const langCode = appLang.split('-')[0];
  const match = availableLocales.find((locale) => locale.startsWith(langCode));

  return match ?? fallback;
}
