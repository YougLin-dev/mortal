export type ThemeType = 'system' | 'light' | 'dark';

export interface ThemeState {
  theme: ThemeType;
  shouldUseDarkColors: boolean;
  shouldUseHighContrastColors: boolean;
  shouldUseInvertedColorScheme: boolean;
}
