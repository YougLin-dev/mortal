<script lang="ts" module>
  import type { DndEvent } from '$lib/dnd';

  interface Props {
    class?: string;
    autoStretch?: boolean;
  }

  type TabDndEvent = DndEvent<Tab>;
</script>

<script lang="ts">
  import { Separator } from '$lib/components/ui/separator';
  import { cn, isMac } from '$lib/utils';
  import { Plus } from '@lucide/svelte';
  import { dndzone, TRIGGERS } from '$lib/dnd';
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

  let isDragging = $state(false);
  let isDraggingOut = $state(false);

  function handleNewTab() {
    windowStore.addTab();
  }

  function handleDndConsider(e: CustomEvent<TabDndEvent>) {
    const { info, items: newItems } = e.detail;
    if (info.trigger === 'DRAG_STARTED') {
      isDragging = true;
      windowStore.reorderTabs(newItems, info.id);
    } else if (info.trigger === TRIGGERS.DRAG_OUT) {
      isDraggingOut = true;

      // Start ghost window with simple text indicator
      if (info.id) {
        const tab = windowStore.tabs.find((t) => t.id === info.id);
        if (tab) {
          window.ghostWindowService
            .start({
              tabName: tab.name
            })
            .catch((error) => {
              logger.error('Failed to start ghost window: {error}', { error });
            });
        }
      }
    } else {
      windowStore.reorderTabs(newItems, info.id);
    }
  }

  function handleDndFinalize(e: CustomEvent<TabDndEvent>) {
    const { info, items: newItems } = e.detail;
    isDragging = false;

    // If ghost window was started, always stop it first
    if (isDraggingOut) {
      isDraggingOut = false;

      // If dragged out of zone, use dropAtPointer to handle collision detection
      if (info.outOfZone && info.id && info.pointer) {
        logger.debug('Tab dragged out, dropping at pointer: {tabId}', { tabId: info.id });

        const tabId = info.id;
        const pointer = info.pointer;

        // Stop ghost window first
        window.ghostWindowService
          .stop()
          .then(() => {
            return window.tabService.dropAtPointer(tabId, { screenX: pointer.screenX, screenY: pointer.screenY });
          })
          .then((result) => {
            if (result) {
              if (result.action === 'merged') {
                logger.info('Tab successfully merged into window: {windowId}', { windowId: result.targetWindowId });
              } else if (result.action === 'detached') {
                logger.info('Tab successfully detached to new window: {windowId}', { windowId: result.newWindowId });
              }
            } else {
              logger.error('Failed to drop tab');
            }
          })
          .catch((error) => {
            logger.error('Error dropping tab: {error}', { error });
          });
        return; // Don't reorder if dropping
      } else {
        // Dragged out but returned to zone - just stop ghost window and reorder
        window.ghostWindowService.stop().catch((error) => {
          logger.error('Failed to stop ghost window: {error}', { error });
        });
      }
    }

    // Normal reorder
    windowStore.reorderTabs(newItems, info.id);
  }
</script>

<div class={cn('flex h-full items-center outline-0', className)} role="tablist" style="app-region: drag;" aria-label="Tab bar" tabindex="0">
  <div
    class={cn(
      'flex h-full min-w-full items-center gap-1 overflow-x-hidden px-4 outline-none focus:outline-none focus-visible:outline-none',
      isMac && 'pl-[80px]'
    )}
    use:dndzone={{
      items: windowStore.tabs,
      orientation: 'horizontal'
    }}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
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
      >
        <TabItem
          {tab}
          stretch={autoStretch}
          closable={true}
          disableHover={isDragging || isDraggingOut}
          onTabClick={() => windowStore.activateTab(tab.id)}
          onTabClose={() => windowStore.removeTab(tab.id)}
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
