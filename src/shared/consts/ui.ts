import { platform } from '@electron-toolkit/utils';

export const WIN = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600
};

export const TITLE_BAR_OVERLAY = {
  DARK: {
    height: 46,
    color: platform.isWindows ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)',
    symbolColor: '#fff'
  },
  LIGHT: {
    height: 46,
    color: 'rgba(255,255,255,0)',
    symbolColor: '#000'
  }
} as const;
