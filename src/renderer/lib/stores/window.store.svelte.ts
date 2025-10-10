import { PersistedStore } from '$lib/stores/core/persisted-store.svelte';
import { STORAGES } from '@/shared/types/storage-key';
import type { Tab, WindowState } from '@/shared/types/window';
import { nanoid } from 'nanoid';
import superjson from 'superjson';
import { getLoggerBy } from '@/shared/logging/helpers';
import { GLOBAL_EVENTS } from '@/shared/types/event';

const logger = getLoggerBy('store', 'window');

// Allow null windowState for migrated views before update
const initialWindowState = window.windowState ? (superjson.parse(superjson.stringify(window.windowState)) as WindowState) : null;

/**
 * WindowStore manages window state and tab navigation.
 *
 * Features:
 * - Tab management (add, remove, reorder, activate)
 * - Always-on-top window control
 * - Automatic persistence to Electron storage
 * - URL synchronization with active tab
 * - Dynamic windowState updates for migrated views
 *
 * @example
 * ```ts
 * // Access state
 * windowStore.tabs
 * windowStore.activeTab
 *
 * // Actions
 * windowStore.addTab()
 * windowStore.removeTab(id)
 * windowStore.toggleAlwaysOnTop()
 * ```
 */
class WindowStore {
  #persisted?: PersistedStore<WindowState>;
  #memory: WindowState;

  constructor() {
    // Use a transient state if windowState is not available yet
    const defaultState: WindowState = {
      windowId: '__pending__',
      type: 'main',
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      isMaximized: false,
      isMinimized: false,
      isFullScreen: false,
      isAlwaysOnTop: false,
      tabs: []
    };

    this.#memory = initialWindowState ?? defaultState;

    if (initialWindowState && initialWindowState.windowId !== '__pending__') {
      this.#persisted = new PersistedStore<WindowState>(STORAGES.APP_WINDOWS(initialWindowState.windowId), initialWindowState);
    }

    // Listen for window state updates (e.g., when view is migrated)
    window.events.on(GLOBAL_EVENTS.WINDOW_STATE_UPDATE, ({ windowState }) => {
      this.#applyNewState(windowState);
    });
  }

  /**
   * Apply a new window state (e.g., after view migration)
   */
  #applyNewState(newState: WindowState): void {
    logger.info('Applying new window state', {
      oldWindowId: this.#memory.windowId,
      newWindowId: newState.windowId
    });

    this.#memory = newState;

    // Rebind persisted store if windowId changed
    const key = STORAGES.APP_WINDOWS(newState.windowId);
    if (!this.#persisted || this.#persisted.current.windowId !== newState.windowId) {
      logger.debug('Rebinding PersistedStore with new windowId', { windowId: newState.windowId });
      this.#persisted = new PersistedStore<WindowState>(key, newState);
    } else {
      // Same window, just update state
      this.#persisted.current = newState;
    }
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get the full window state
   */
  get state(): WindowState {
    return this.#persisted?.current ?? this.#memory;
  }

  /**
   * Update the full window state
   */
  set state(newState: WindowState) {
    if (this.#persisted) {
      this.#persisted.current = newState;
    }
    this.#memory = newState;
  }

  // ============================================================================
  // Tab Getters
  // ============================================================================

  /**
   * Get all tabs
   */
  get tabs(): Tab[] {
    return this.state.tabs;
  }

  /**
   * Set all tabs
   */
  set tabs(tabs: Tab[]) {
    this.state.tabs = tabs;
  }

  /**
   * Get the active tab ID
   */
  get activeTabId(): string | undefined {
    return this.tabs.find((tab) => tab.isActive)?.id;
  }

  /**
   * Get the active tab
   */
  get activeTab(): Tab | undefined {
    return this.tabs.find((tab) => tab.isActive);
  }

  // ============================================================================
  // Window State Getters
  // ============================================================================

  /**
   * Get the window ID
   */
  get windowId(): string {
    return this.state.windowId;
  }

  /**
   * Check if window is always on top
   */
  get isAlwaysOnTop(): boolean {
    return this.state.isAlwaysOnTop;
  }

  /**
   * Set always on top state
   */
  set isAlwaysOnTop(value: boolean) {
    this.state.isAlwaysOnTop = value;
  }

  // ============================================================================
  // Tab Actions
  // ============================================================================

  /**
   * Add a new empty tab and activate it
   */
  addTab(): void {
    const newTabId = nanoid(6);
    const newTabUrl = '/chat/' + newTabId;

    this.tabs = this.tabs
      .map((tab) => ({
        ...tab,
        isActive: false
      }))
      .concat({
        id: newTabId,
        name: 'New Tab' + newTabId,
        isActive: true,
        pinned: false,
        url: newTabUrl
      });

    // Create and display the contentView for the new tab
    window.tabService.switchTab(newTabId, newTabUrl).catch((error) => {
      logger.error('Failed to create tab view', { error, tabId: newTabId });
    });
  }

  /**
   * Activate a tab by ID
   */
  activateTab(tabId: string): void {
    // Skip if tab is already active
    if (this.activeTabId === tabId) {
      logger.debug('Tab already active, skipping', { tabId });
      return;
    }

    logger.debug('Activating tab', { tabId });

    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) {
      logger.error('Tab not found', { tabId });
      return;
    }

    this.tabs = this.tabs.map((tab) => ({
      ...tab,
      isActive: tab.id === tabId
    }));

    window.tabService.switchTab(tabId, tab.url).catch((error) => {
      logger.error('Failed to switch tab view', { error, tabId });
    });
  }

  /**
   * Remove a tab by ID
   */
  removeTab(tabId: string): void {
    const removedTabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    const wasActive = this.tabs[removedTabIndex]?.isActive;

    // Remove the tab
    this.tabs = this.tabs.filter((tab) => tab.id !== tabId);

    // Destroy the corresponding WebContentsView
    window.tabService.closeTab(tabId).catch((error) => {
      logger.error('Failed to close tab view', { error, tabId });
    });

    // If the removed tab was active and there are still tabs left, activate another one
    if (wasActive && this.tabs.length > 0) {
      // Activate the tab at the same index, or the previous one if we're at the end
      const newActiveIndex = Math.min(removedTabIndex, this.tabs.length - 1);
      const newActiveTab = this.tabs[newActiveIndex];
      this.tabs = this.tabs.map((tab, index) => ({
        ...tab,
        isActive: index === newActiveIndex
      }));

      // Switch to the newly activated tab
      window.tabService.switchTab(newActiveTab.id, newActiveTab.url).catch((error) => {
        logger.error('Failed to switch tab after removal', { error, tabId: newActiveTab.id });
      });
    }

    // If all tabs are closed, create a new tab automatically
    if (this.tabs.length === 0) {
      logger.debug('All tabs closed, creating new tab');
      this.addTab();
    }
  }

  /**
   * Remove a tab locally without destroying its WebContentsView
   * Used when tab is detached to another window
   */
  removeTabLocally(tabId: string): void {
    logger.debug('Removing tab locally (no view destruction)', { tabId });

    const removedIndex = this.tabs.findIndex((t) => t.id === tabId);
    if (removedIndex === -1) {
      logger.warn('Tab not found for local removal', { tabId });
      return;
    }

    const wasActive = this.tabs[removedIndex]?.isActive;

    // Remove the tab from state
    this.tabs = this.tabs.filter((t) => t.id !== tabId);

    // If the removed tab was active and there are still tabs left, activate another one
    if (wasActive && this.tabs.length > 0) {
      const newActiveIndex = Math.min(removedIndex, this.tabs.length - 1);
      const newActiveTab = this.tabs[newActiveIndex];
      this.tabs = this.tabs.map((t, i) => ({
        ...t,
        isActive: i === newActiveIndex
      }));

      // Switch to the newly activated tab
      window.tabService.switchTab(newActiveTab.id, newActiveTab.url).catch((error) => {
        logger.error('Failed to switch tab after local removal', { error, tabId: newActiveTab.id });
      });
    }

    // If all tabs are closed, create a new tab automatically
    if (this.tabs.length === 0) {
      logger.debug('All tabs closed after detach, creating new tab');
      this.addTab();
    }
  }

  /**
   * Remove all tabs
   */
  removeAllTabs(): void {
    this.tabs = [];
  }

  /**
   * Reorder tabs
   * @param newOrder - New tab order
   * @param draggedElementId - ID of the dragged tab (will be activated)
   */
  reorderTabs(newOrder: Tab[], draggedElementId?: string | null): void {
    if (draggedElementId) {
      newOrder = newOrder.map((tab) => ({
        ...tab,
        isActive: tab.id === draggedElementId
      }));
    }
    this.tabs = newOrder;
  }

  // ============================================================================
  // Window Actions
  // ============================================================================

  /**
   * Toggle always on top state
   */
  async toggleAlwaysOnTop(): Promise<void> {
    try {
      const newState = !this.isAlwaysOnTop;
      await window.shellWindowService.setAlwaysOnTop(newState);
      this.isAlwaysOnTop = newState;
    } catch (error) {
      logger.error('Failed to toggle always on top: {error}', { error });
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Global window store instance
 */
export const windowStore = new WindowStore();

window.events.on(GLOBAL_EVENTS.TAB_CONTEXT_MENU_ACTION, ({ action, tabId }) => {
  if (action === 'close' && tabId) {
    const tab = windowStore.tabs.find((t) => t.id === tabId);
    if (tab) windowStore.removeTab(tab.id);
  } else if (action === 'close-all') {
    const allTabs = [...windowStore.tabs];
    allTabs.forEach((tab) => windowStore.removeTab(tab.id));
  }
});

window.events.on(GLOBAL_EVENTS.TAB_DETACHED, ({ tabId, newWindowId }) => {
  logger.info('Tab detached event received', { tabId, newWindowId });
  windowStore.removeTabLocally(tabId);
});

window.events.on(GLOBAL_EVENTS.TAB_ATTACHED, ({ tabId, tab, originWindowId }) => {
  logger.info('Tab attached event received', { tabId, originWindowId });

  // Deactivate all existing tabs and add the new tab as active
  windowStore.tabs = windowStore.tabs.map((t) => ({ ...t, isActive: false })).concat(tab);

  // Switch to the new tab
  window.tabService.switchTab(tab.id, tab.url).catch((error) => {
    logger.error('Failed to switch to attached tab', { error, tabId });
  });
});
