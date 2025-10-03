/**
 * Supported locale codes
 */
export type LocaleCode = 'en' | 'zh' | 'ja';

/**
 * Locale metadata
 */
export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Supported locales with metadata
 */
export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' }
];
