import { ElectronStore } from '$lib/hooks/electron-store.svelte';
import { watchRoot } from '$lib/hooks/watch.svelte';
import { STORAGES } from '@/shared/types/storage-key';
import type { Tab, WindowState } from '@/shared/types/window';
import { goto } from '@mateothegreat/svelte5-router';
import { nanoid } from 'nanoid';
import superjson from 'superjson';

const initialWindowState = superjson.parse(superjson.stringify(window.windowState)) as WindowState;

export const windowStore = new ElectronStore<WindowState>(STORAGES.APP_WINDOWS(initialWindowState.windowId), initialWindowState);

export const TabsManager = {
  get tabs() {
    return windowStore.current.tabs;
  },
  get activeTabId() {
    return windowStore.current.tabs.find((tab) => tab.isActive)?.id;
  },
  get activeTab() {
    return windowStore.current.tabs.find((tab) => tab.isActive);
  },
  set tabs(tabs: Tab[]) {
    windowStore.current.tabs = tabs;
  },
  addNewEmptyTab: () => {
    const newTabId = nanoid(6);
    TabsManager.tabs = windowStore.current.tabs
      .map((tab) => ({
        ...tab,
        isActive: false
      }))
      .concat({
        id: newTabId,
        name: 'New Tab' + newTabId,
        isActive: true,
        pinned: false,
        url: '/chat/' + newTabId
      });
  },
  clickTab: (tabId: string) => {
    const currentTabs = TabsManager.tabs;
    TabsManager.tabs = currentTabs.map((tab) => {
      if (tab.id !== tabId && tab.isActive) {
        return { ...tab, isActive: false };
      }
      return { ...tab, isActive: tab.id === tabId };
    });
  },
  removeTab: (tabId: string) => {
    TabsManager.tabs = TabsManager.tabs.filter((tab) => tab.id !== tabId);
  },
  removeAllTabs: () => {
    TabsManager.tabs = [];
  },
  reorderTabs: (newOrder: Tab[], draggedElementId?: string | null) => {
    const currentTabs = TabsManager.tabs;
    const hasChanges = newOrder.length !== currentTabs.length || newOrder.some((item, index) => item !== currentTabs[index]);
    if (hasChanges) {
      if (draggedElementId) {
        newOrder = newOrder.map((tab) => {
          if (tab.id !== draggedElementId && tab.isActive) {
            return { ...tab, isActive: false };
          }
          return { ...tab, isActive: tab.id === draggedElementId };
        });
      }
      TabsManager.tabs = newOrder;
    }
  }
};

export const toggleAlwaysOnTop = async () => {
  try {
    const newState = !windowStore.current.isAlwaysOnTop;
    await window.windowService.setAlwaysOnTop(newState);
    windowStore.current.isAlwaysOnTop = newState;
  } catch (error) {
    console.error('Failed to toggle always on top:', error);
  }
};

let previousActiveTabUrl: string | undefined;

watchRoot(() => {
  const currentActiveTabUrl = TabsManager.activeTab?.url || '/welcome';

  if (previousActiveTabUrl !== currentActiveTabUrl) {
    console.log('  ✅ URL changed, executing goto:', currentActiveTabUrl);
    goto(currentActiveTabUrl);
    previousActiveTabUrl = currentActiveTabUrl;
  } else {
    console.log('  ❌ URL unchanged, skipping goto');
  }
});
