<script lang="ts" module>
  import type { DndEvent } from 'svelte-dnd-action';

  interface Props {
    class?: string;
    autoStretch?: boolean;
  }

  type TabDndEvent = DndEvent<Tab>;
</script>

<script lang="ts">
  import { TooltipButton } from '$lib/components/ui/tooltip-button';
  import { Separator } from '$lib/components/ui/separator';
  import { cn } from '$lib/utils';
  import { Plus } from '@lucide/svelte';
  import { dndzone, TRIGGERS } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import TabItem from './tabbar-item.svelte';
  import type { Tab } from '@/shared/types/window';
  import { TabsManager } from '$lib/stores/window.state.svelte';

  let { class: className, autoStretch = false }: Props = $props();

  let draggedElementId = $state<string | null>(null);

  function handleNewTab() {
    TabsManager.addNewEmptyTab();
  }

  function handleDndConsider(e: CustomEvent<TabDndEvent>) {
    const { info, items: newItems } = e.detail;
    console.log(info.trigger);

    if (info.trigger === TRIGGERS.DRAG_STARTED) {
      draggedElementId = info.id;
      TabsManager.reorderTabs(newItems, draggedElementId);
    }
    if (info.trigger === TRIGGERS.DRAGGED_OVER_INDEX) {
      TabsManager.reorderTabs(newItems, draggedElementId);
    }
  }

  function handleDndFinalize(e: CustomEvent<TabDndEvent>) {
    try {
      TabsManager.reorderTabs(e.detail.items, draggedElementId);
      draggedElementId = null;
    } catch (error) {
      console.error('Error finalizing drag operation:', error);
    } finally {
      queueMicrotask(() => {});
    }
  }
  function transformDraggedElement(element?: HTMLElement) {
    if (!element) return;

    try {
      element.style.outline = 'none';

      const tabElement = element.querySelector('[role="button"]') as HTMLElement;
      tabElement?.classList.remove('hover:bg-tabbar-accent', 'hover:text-tabbar-accent-foreground', 'transition-colors');
      tabElement?.classList.add('bg-tabbar-active', 'text-tabbar-active-foreground', 'shadow-sm');
    } catch (error) {
      console.warn('Error transforming dragged element:', error);
    }
  }
</script>

<div class={cn('flex items-center', className)} role="tablist" style="app-region: drag;" aria-label="Tab bar">
  <div
    class={cn('flex min-w-0 items-center gap-1 overflow-x-hidden px-4', window.isMac && 'pl-[80px]')}
    use:dndzone={{
      items: TabsManager.tabs,
      flipDurationMs: 200,
      dropTargetStyle: {},
      transformDraggedElement,
      morphDisabled: true,
      autoAriaDisabled: false,
      zoneTabIndex: 0,
      zoneItemTabIndex: 0
    }}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
  >
    {#each TabsManager.tabs as tab, index (tab.id)}
      {@const isCurrentActive = tab.id === TabsManager.activeTabId}
      {@const nextTab = TabsManager.tabs[index + 1]}
      {@const isNextActive = nextTab?.id === TabsManager.activeTabId}
      {@const isLastTab = index === TabsManager.tabs.length - 1}
      {@const shouldShowSeparator = !isLastTab && !isCurrentActive && !isNextActive}
      <div
        class={cn('flex min-w-0 items-center', autoStretch && 'flex-1 basis-0')}
        data-id={tab.id}
        role="presentation"
        aria-label={tab.name}
        animate:flip={{ duration: 200 }}
      >
        <TabItem
          {tab}
          stretch={autoStretch}
          closable={true}
          onTabClick={() => TabsManager.clickTab(tab.id)}
          onTabClose={() => TabsManager.removeTab(tab.id)}
          onTabCloseAll={() => TabsManager.removeAllTabs()}
        />
        <div class="shrink-0 px-0.5" style="cursor: pointer !important;">
          <Separator
            orientation="vertical"
            class="!h-[20px] !w-0.5 transition-opacity duration-200 {shouldShowSeparator ? 'opacity-30' : 'opacity-0'}"
          />
        </div>
      </div>
    {/each}

    <div class="flex shrink-0 items-center self-end">
      <Separator
        orientation="vertical"
        class={cn('mx-0.5 !h-[20px] !w-0.5', TabsManager.tabs.length === 0 ? 'opacity-0' : 'opacity-100')}
        style="cursor: none !important;"
      />
      <TooltipButton
        tooltip="新建标签页"
        side="bottom"
        variant="ghost"
        size="icon"
        class="size-8 rounded-full transition-colors hover:bg-tabbar-accent hover:text-tabbar-accent-foreground dark:hover:bg-tabbar-accent dark:hover:text-tabbar-accent-foreground"
        style="app-region: no-drag;"
        onclick={handleNewTab}
      >
        <Plus class="size-4" />
      </TooltipButton>
    </div>
  </div>
</div>
