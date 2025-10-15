<script lang="ts" module>
  interface Props {
    class?: string;
    autoStretch?: boolean;
  }
</script>

<script lang="ts">
  import { Separator } from '$lib/components/ui/separator';
  import { cn, isMac } from '$lib/utils';
  import { Plus } from '@lucide/svelte';
  import { cubicOut } from 'svelte/easing';
  import { getLoggerBy } from '@/shared/logging/helpers';

  const logger = getLoggerBy('component', 'tabbar');

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
  import TabItem from './tabbar-item.svelte';
  import type { Tab } from '@/shared/types/window';
  import { windowStore } from '$lib/stores/window.store.svelte';

  let { class: className, autoStretch = false }: Props = $props();

  let draggedTabId = $state<string | null>(null);

  function handleNewTab() {
    windowStore.addChatTab();
  }

  function handleDragStart(e: DragEvent, tab: Tab) {
    if (!e.dataTransfer) return;

    draggedTabId = tab.id;
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

    // Reorder tabs optimistically
    if (draggedTabId) {
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

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    logger.debug('Drop occurred in same window');

    // Finalize the reorder (already done in dragover)
    draggedTabId = null;
  }

  async function handleDragEnd(e: DragEvent) {
    const tabId = draggedTabId;
    draggedTabId = null;

    // Stop tracking
    await window.ghostWindowService.stopTracking().catch((error) => {
      logger.error('Failed to stop tracking: {error}', { error });
    });

    // Check if dropped outside the window
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

    logger.debug('Drag ended');
  }
</script>

<div class={cn('flex h-full items-center outline-0', className)} role="tablist" style="app-region: drag;" aria-label="Tab bar" tabindex="0">
  <div
    role="group"
    class={cn(
      'flex h-full min-w-full items-center gap-1 overflow-x-hidden px-4 outline-none focus:outline-none focus-visible:outline-none',
      isMac && 'pl-[80px]'
    )}
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
        class={cn('flex min-w-0 items-center', autoStretch && 'flex-1 basis-0')}
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
        <div class="shrink-0 px-0.5" style="cursor: pointer !important;">
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
