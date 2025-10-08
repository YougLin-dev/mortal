import { type WebContentsView, BaseWindow, type WebContents } from 'electron';

export type ViewType = 'titlebar' | 'content';

export interface TaggedWebContentsView extends WebContentsView {
  __viewType?: ViewType;
  __tabId?: string;
}

export function tagView(view: WebContentsView, type: ViewType, tabId?: string): TaggedWebContentsView {
  const tagged = view as TaggedWebContentsView;
  tagged.__viewType = type;
  if (tabId) tagged.__tabId = tabId;
  return tagged;
}

export function getTitlebarView(window: BaseWindow): TaggedWebContentsView | null {
  const views = window.contentView.children as TaggedWebContentsView[];
  return views.find((v) => v.__viewType === 'titlebar') ?? null;
}

export function getContentViews(window: BaseWindow): TaggedWebContentsView[] {
  const views = window.contentView.children as TaggedWebContentsView[];
  return views.filter((v) => v.__viewType === 'content');
}

export function getContentViewByTabId(window: BaseWindow, tabId: string): TaggedWebContentsView | null {
  const views = window.contentView.children as TaggedWebContentsView[];
  return views.find((v) => v.__viewType === 'content' && v.__tabId === tabId) ?? null;
}

export function getWindowByWebContents(webContents: WebContents) {
  const windows = BaseWindow.getAllWindows();
  const window = windows.find((win) => {
    const views = win.contentView.children as WebContentsView[];
    return views.some((view) => view.webContents.id === webContents.id);
  });

  return window;
}
