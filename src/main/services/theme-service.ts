import type { IpcMainInvokeEvent } from 'electron';
import { nativeTheme, BrowserWindow } from 'electron';
import { Handler, Service } from '@/shared/decorators';
import { TITLE_BAR_OVERLAY } from '@/shared/consts/ui';
import type { ThemeType } from '@/shared/types/theme';
import { STORAGES } from '@/shared/types/storage-key';
import { storage } from '@/main/storage';

@Service
export class ThemeService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  async initFromStorage() {
    const state = await storage.getItem(STORAGES.APP_THEME_STATE);
    console.log(`state = ${JSON.stringify(state)}, ${typeof state}`);

    if (state == null) {
      console.warn('Unable to laod themeState from storage');
      return;
    }

    nativeTheme.themeSource = state.theme;
  }

  @Handler
  setTheme(_event: IpcMainInvokeEvent, theme: ThemeType): void {
    nativeTheme.themeSource = theme;
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach((window) => {
      window.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1f2020' : '#f4f3f2');
      window.setTitleBarOverlay(nativeTheme.shouldUseDarkColors ? TITLE_BAR_OVERLAY.DARK : TITLE_BAR_OVERLAY.LIGHT);
    });
  }
}

export const themeService = new ThemeService();
