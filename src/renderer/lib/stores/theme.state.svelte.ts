import type { ThemeState, ThemeType } from '@/shared/types/theme';
import { ElectronStore } from '$lib/hooks/electron-store.svelte';
import { STORAGES } from '@/shared/types/storage-key';
import { watchRoot } from '$lib/hooks/watch.svelte';
import { untrack } from 'svelte';

const getSystemTheme = (): ThemeState => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    theme: isDark ? 'dark' : 'light',
    shouldUseDarkColors: isDark,
    shouldUseHighContrastColors: false,
    shouldUseInvertedColorScheme: false
  };
};

export const transitionState = $state({
  isTransitioning: false
});
export const themeStore = new ElectronStore(STORAGES.APP_THEME_STATE, getSystemTheme());

watchRoot(() => {
  const currentState = themeStore.current;
  window.themeService.setTheme(currentState.theme).then(() => {
    untrack(() => {
      const isDarkCurrentlyApplied = document.documentElement.classList.contains('dark');
      const shouldApplyDark = currentState.shouldUseDarkColors;

      if (isDarkCurrentlyApplied !== shouldApplyDark) {
        if (shouldApplyDark) {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('no-transition', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('no-transition', 'light');
        }

        setTimeout(() => {
          document.documentElement.classList.remove('no-transition');
        }, 100);
      }

      transitionState.isTransitioning = false;
    });
  });
});

export function toggleTheme() {
  setTheme(themeStore.current.shouldUseDarkColors ? 'light' : 'dark');
}

export function setTheme(theme: ThemeType) {
  transitionState.isTransitioning = true;
  const currentState = themeStore.current;
  themeStore.current = {
    ...currentState,
    theme,
    shouldUseDarkColors: theme === 'system' ? currentState.shouldUseDarkColors : theme === 'dark'
  };
}
