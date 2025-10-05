import { PersistedStore } from '$lib/stores/core/persisted-store.svelte';
import { createRootEffect } from '$lib/stores/core/create-root-effect.svelte';
import { STORAGES } from '@/shared/types/storage-key';
import type { Tab, WindowState } from '@/shared/types/window';
import { goto } from '@mateothegreat/svelte5-router';
import { nanoid } from 'nanoid';
import superjson from 'superjson';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('store', 'window');

const initialWindowState = superjson.parse(superjson.stringify(window.windowState)) as WindowState;
/**
 * WindowStore manages window state and tab navigation.
 *
 * Features:
 * - Tab management (add, remove, reorder, activate)
 * - Always-on-top window control
 * - Automatic persistence to Electron storage
 * - URL synchronization with active tab
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
  #persisted: PersistedStore<WindowState>;
  #previousActiveTabUrl: string | undefined;

  constructor() {
    this.#persisted = new PersistedStore<WindowState>(STORAGES.APP_WINDOWS(initialWindowState.windowId), initialWindowState);

    // Setup URL synchronization
    this.#setupUrlSync();
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get the full window state
   */
  get state(): WindowState {
    return this.#persisted.current;
  }

  /**
   * Update the full window state
   */
  set state(newState: WindowState) {
    this.#persisted.current = newState;
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
        url: '/chat/' + newTabId
      });
  }

  /**
   * Activate a tab by ID
   */
  activateTab(tabId: string): void {
    logger.debug('Activating tab', { tabId });
    this.tabs = this.tabs.map((tab) => ({
      ...tab,
      isActive: tab.id === tabId
    }));
  }

  /**
   * Remove a tab by ID
   */
  removeTab(tabId: string): void {
    const removedTabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    const wasActive = this.tabs[removedTabIndex]?.isActive;

    // Remove the tab
    this.tabs = this.tabs.filter((tab) => tab.id !== tabId);

    // If the removed tab was active and there are still tabs left, activate another one
    if (wasActive && this.tabs.length > 0) {
      // Activate the tab at the same index, or the previous one if we're at the end
      const newActiveIndex = Math.min(removedTabIndex, this.tabs.length - 1);
      this.tabs = this.tabs.map((tab, index) => ({
        ...tab,
        isActive: index === newActiveIndex
      }));
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
      await window.windowService.setAlwaysOnTop(newState);
      this.isAlwaysOnTop = newState;
    } catch (error) {
      logger.error('Failed to toggle always on top: {error}', { error });
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Setup URL synchronization with active tab
   */
  #setupUrlSync(): void {
    createRootEffect(() => {
      const currentActiveTabUrl = this.activeTab?.url || '/welcome';

      if (this.#previousActiveTabUrl !== currentActiveTabUrl) {
        logger.debug('URL changed, executing goto', { url: currentActiveTabUrl });
        goto(currentActiveTabUrl);
        this.#previousActiveTabUrl = currentActiveTabUrl;
      } else {
        logger.debug('URL unchanged, skipping goto');
      }
    });
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Global window store instance
 */
export const windowStore = new WindowStore();
