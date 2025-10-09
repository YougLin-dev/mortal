export const WIN = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  BACKGROUND_CORLOR: {
    DARK: '#1f2020',
    LIGHT: '#f4f3f2'
  },
  CONTENTVIEW_BACKGROUND_COLOR: {
    DARK: '#2a2a2a',
    LIGHT: '#e8e8e8'
  }
} as const;

export const TITLE_BAR_OVERLAY = {
  DARK: {
    height: 46,
    color: 'rgba(0,0,0,0)',
    symbolColor: '#fff'
  },
  LIGHT: {
    height: 46,
    color: 'rgba(255,255,255,0)',
    symbolColor: '#000'
  }
} as const;

export const TITLEBAR_CONTROLS_WIDTH = {
  LINUX: 96,
  WINDOWS: 138
} as const;
