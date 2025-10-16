<script lang="ts" module>
  interface Props {
    class?: string;
    autoStretch?: boolean;
  }

  function slideExpand(node: Element, { duration = 300, easing = cubicOut } = {}) {
    const originalWidth = node.scrollWidth;

    return {
      duration,
      easing,
      css: (t: number) => `
        max-width: ${t * originalWidth}px;
        opacity: ${Math.min(t * 1.5, 1)};
        overflow: hidden;
      `
    };
  }
</script>

<script lang="ts">
  import { Separator } from '$lib/components/ui/separator';
  import { cn, isMac } from '$lib/utils';
  import { Plus } from '@lucide/svelte';
  import { cubicOut } from 'svelte/easing';
  import { getLoggerBy } from '@/shared/logging/helpers';

  const logger = getLoggerBy('component', 'tabbar');

  import TabItem from './tabbar-item.svelte';
  import type { Tab } from '@/shared/types/window';
  import { windowStore } from '$lib/stores/window.store.svelte';

  let { class: className, autoStretch = false }: Props = $props();

  let draggedTabId = $state<string | null>(null);
  let pendingTargetIndex = $state<number | null>(null);
  let droppedInThisWindow = $state<boolean>(false);
  let groupEl: HTMLElement | null = null;

  function handleNewTab() {
    windowStore.addChatTab();
  }

  function handleDragStart(e: DragEvent, tab: Tab) {
    if (!e.dataTransfer) return;

    draggedTabId = tab.id;
    pendingTargetIndex = null;
    droppedInThisWindow = false;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.id);

    // Start tracking for cross-window detection
    window.ghostWindowService.startTracking().catch((error) => {
      logger.error('Failed to start tracking: {error}', { error });
    });

    logger.debug('Drag started for tab {tabId}', { tabId: tab.id });
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    e.dataTransfer.dropEffect = 'move';

    // Calculate target index based on pointer position
    const target = e.currentTarget as HTMLElement;
    const tabElements = Array.from(target.querySelectorAll('[data-id]')) as HTMLElement[];

    let targetIndex = tabElements.length;
    for (let i = 0; i < tabElements.length; i++) {
      const el = tabElements[i];
      const rect = el.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;

      if (e.clientX < midpoint) {
        targetIndex = i;
        break;
      }
    }
    // Only record the intended target index; do not reorder during drag
    pendingTargetIndex = targetIndex;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    logger.debug('Drop occurred in same window');

    droppedInThisWindow = true;

    // Finalize reorder now that the drag has completed
    if (draggedTabId != null) {
      // Fallback: compute target index again if we didn't get a prior dragover
      let targetIndex = pendingTargetIndex;
      if (targetIndex == null) {
        const target = e.currentTarget as HTMLElement;
        const tabElements = Array.from(target.querySelectorAll('[data-id]')) as HTMLElement[];
        targetIndex = tabElements.length;
        for (let i = 0; i < tabElements.length; i++) {
          const el = tabElements[i];
          const rect = el.getBoundingClientRect();
          const midpoint = rect.left + rect.width / 2;
          if (e.clientX < midpoint) {
            targetIndex = i;
            break;
          }
        }
      }

      if (targetIndex != null) {
        const currentIndex = windowStore.tabs.findIndex((t) => t.id === draggedTabId);
        if (currentIndex !== -1 && currentIndex !== targetIndex) {
          const newTabs = [...windowStore.tabs];
          const [removed] = newTabs.splice(currentIndex, 1);
          const insertAt = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
          newTabs.splice(insertAt, 0, removed);
          windowStore.reorderTabs(newTabs);
        }
      }
    }

    // Clear drag state
    draggedTabId = null;
    pendingTargetIndex = null;
    droppedInThisWindow = false;
  }

  async function handleDragEnd(e: DragEvent) {
    const tabId = draggedTabId;
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Stop tracking
    await window.ghostWindowService.stopTracking().catch((error) => {
      logger.error('Failed to stop tracking: {error}', { error });
    });

    // If drop event already handled locally, just cleanup state and exit
    if (droppedInThisWindow) {
      draggedTabId = null;
      pendingTargetIndex = null;
      droppedInThisWindow = false;
      logger.debug('Drag ended (handled by same-window drop)');
      return;
    }

    // If pointer is still within our tabbar container, treat as in-window drop
    if (groupEl && tabId) {
      const rect = groupEl.getBoundingClientRect();
      const inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      if (inside) {
        // Perform final reorder if we computed a target index during drag
        if (pendingTargetIndex != null) {
          const currentIndex = windowStore.tabs.findIndex((t) => t.id === tabId);
          if (currentIndex !== -1 && currentIndex !== pendingTargetIndex) {
            const newTabs = [...windowStore.tabs];
            const [removed] = newTabs.splice(currentIndex, 1);
            const insertAt = pendingTargetIndex > currentIndex ? pendingTargetIndex - 1 : pendingTargetIndex;
            newTabs.splice(insertAt, 0, removed);
            windowStore.reorderTabs(newTabs);
          }
        }

        draggedTabId = null;
        pendingTargetIndex = null;
        droppedInThisWindow = false;
        logger.debug('Drag ended (treated as same-window drop by bounds)');
        return;
      }
    }

    // Otherwise, treat as potential cross-window action only if no valid drop target
    if (e.dataTransfer?.dropEffect === 'none' && tabId) {
      logger.info('Tab dragged out of window, calling dropAtPointer');

      const result = await window.tabService.dropAtPointer(tabId, {
        screenX: e.screenX,
        screenY: e.screenY
      });

      if (result) {
        if (result.action === 'merged') {
          logger.info('Tab merged into window {windowId}', { windowId: result.targetWindowId });
        } else if (result.action === 'detached') {
          logger.info('Tab detached to new window {windowId}', { windowId: result.newWindowId });
        }
      }
    }

    draggedTabId = null;
    pendingTargetIndex = null;
    droppedInThisWindow = false;
    logger.debug('Drag ended');
  }
</script>

<div class={cn('flex h-full items-center outline-0', className)} role="tablist" style="app-region: drag;" aria-label="Tab bar" tabindex="0">
  <div
    role="group"
    class={cn(
      'flex h-[calc(100%-var(--spacing)*2)] min-w-full items-center gap-1 overflow-hidden overflow-x-hidden px-2 py-1 outline-none focus:outline-none focus-visible:outline-none',
      isMac && 'pl-[80px]'
    )}
    bind:this={groupEl}
    ondragover={handleDragOver}
    ondrop={handleDrop}
  >
    {#each windowStore.tabs as tab, index (tab.id)}
      {@const isCurrentActive = tab.id === windowStore.activeTabId}
      {@const nextTab = windowStore.tabs[index + 1]}
      {@const isNextActive = nextTab?.id === windowStore.activeTabId}
      {@const isLastTab = index === windowStore.tabs.length - 1}
      {@const shouldShowSeparator = !isLastTab && !isCurrentActive && !isNextActive}
      <div
        class={cn('flex h-full min-w-0 items-center', autoStretch && 'flex-1 basis-0')}
        data-id={tab.id}
        role="presentation"
        aria-label={tab.name}
        in:slideExpand={{ duration: 300, easing: cubicOut }}
        out:slideExpand={{ duration: 200, easing: cubicOut }}
        ondragend={handleDragEnd}
      >
        <TabItem
          {tab}
          stretch={autoStretch}
          closable={true}
          onTabClick={() => windowStore.activateTab(tab.id)}
          onTabClose={() => windowStore.removeTab(tab.id)}
          onDragStart={handleDragStart}
        />
        <div class="shrink-0" style="cursor: pointer !important;">
          <Separator
            orientation="vertical"
            class="!h-[20px] !w-0.5 transition-opacity duration-200 {shouldShowSeparator ? 'opacity-30' : 'opacity-0'}"
          />
        </div>
      </div>
    {/each}

    <div class="flex shrink-0 items-center">
      <Separator
        orientation="vertical"
        class={cn('mx-0.5 !h-[20px] !w-0.5', windowStore.tabs.length === 0 ? 'opacity-0' : 'opacity-100')}
        style="cursor: none !important;"
      />
      <button
        title="新建标签页"
        class="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-tabbar-accent hover:text-tabbar-accent-foreground dark:hover:bg-tabbar-accent dark:hover:text-tabbar-accent-foreground"
        style="app-region: no-drag;"
        onclick={handleNewTab}
      >
        <Plus class="size-4" />
      </button>
    </div>
  </div>
</div>
