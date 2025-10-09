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
    } else {
      windowStore.reorderTabs(newItems, info.id);
    }
  }

  function handleDndFinalize(e: CustomEvent<TabDndEvent>) {
    const { info, items: newItems } = e.detail;
    isDragging = false;
    isDraggingOut = false;

    // If dragged out of zone, detach to new window
    if (info.outOfZone && info.id && info.pointer) {
      console.log('Tab dragged out, detaching to new window:', info.id);
      window.tabService
        .detachToNewWindow(info.id, { screenX: info.pointer.screenX, screenY: info.pointer.screenY })
        .then((result) => {
          if (result) {
            console.log('Tab successfully detached to new window:', result.newWindowId);
          } else {
            console.error('Failed to detach tab to new window');
          }
        })
        .catch((error) => {
          console.error('Error detaching tab:', error);
        });
      return; // Don't reorder if detaching
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
