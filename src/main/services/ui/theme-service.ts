import type { IpcMainInvokeEvent } from 'electron';
import { nativeTheme } from 'electron';
import { Handler, Service } from '@/shared/decorators';
import { TITLE_BAR_OVERLAY, WIN } from '@/shared/consts/ui';
import type { ThemeType } from '@/shared/types/theme';
import { STORAGES } from '@/shared/types/storage-key';
import { storage } from '@/main/core/storage/config';
import { getLoggerBy } from '@/shared/logging/helpers';
import { getContentViews, getTitlebarView } from '@/shared/types/view';
import { getAllShellWindows } from '@/shared/types/window';

const logger = getLoggerBy('service', 'theme');

@Service
export class ThemeService {
  constructor() {
    const state = storage.getItemSync(STORAGES.APP_THEME_STATE);
    logger.debug('Loaded theme state {stateType}', { stateType: typeof state });

    if (state == null) {
      logger.warn('Unable to load themeState from storage');
      return;
    }

    nativeTheme.themeSource = state.theme;
  }

  @Handler
  setTheme(_event: IpcMainInvokeEvent, theme: ThemeType): void {
    nativeTheme.themeSource = theme;
    const allWindows = getAllShellWindows();
    const topViewbackgroundColor = nativeTheme.shouldUseDarkColors ? WIN.BACKGROUND_CORLOR.DARK : WIN.BACKGROUND_CORLOR.LIGHT;
    const bottomBackgroundColor = topViewbackgroundColor;

    allWindows.forEach((window) => {
      window.setBackgroundColor(topViewbackgroundColor);
      window.setTitleBarOverlay(nativeTheme.shouldUseDarkColors ? TITLE_BAR_OVERLAY.DARK : TITLE_BAR_OVERLAY.LIGHT);

      const titlebar = getTitlebarView(window);
      const contentViews = getContentViews(window);

      if (titlebar) {
        titlebar.setBackgroundColor(topViewbackgroundColor);
      }

      contentViews.forEach((view) => {
        view.setBackgroundColor(bottomBackgroundColor);
      });
    });
  }
}

export const themeService = new ThemeService();
