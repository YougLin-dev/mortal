<script lang="ts" module>
  import type { DndEvent } from '$lib/dnd';

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
  import { dndzone } from '$lib/dnd';
  import { flip } from 'svelte/animate';
  import TabItem from './tabbar-item.svelte';
  import type { Tab } from '@/shared/types/window';
  import { windowStore } from '$lib/stores/window.store.svelte';

  let { class: className, autoStretch = false }: Props = $props();

  function handleNewTab() {
    windowStore.addTab();
  }

  function handleDndConsider(e: CustomEvent<TabDndEvent>) {
    const { info, items: newItems } = e.detail;
    if (info.trigger === 'DRAG_STARTED') windowStore.reorderTabs(newItems, info.id);
  }

  function handleDndFinalize(e: CustomEvent<TabDndEvent>) {
    const { info, items: newItems } = e.detail;
    windowStore.reorderTabs(newItems, info.id);
  }
</script>

<div class={cn('flex h-full items-center outline-0', className)} role="tablist" style="app-region: drag;" aria-label="Tab bar" tabindex="0">
  <div
    class={cn(
      'flex h-full min-w-full items-center gap-1 overflow-x-hidden px-4 outline-none focus:outline-none focus-visible:outline-none',
      window.isMac && 'pl-[80px]'
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
        animate:flip={{ duration: 200 }}
      >
        <TabItem
          {tab}
          stretch={autoStretch}
          closable={true}
          onTabClick={() => windowStore.activateTab(tab.id)}
          onTabClose={() => windowStore.removeTab(tab.id)}
          onTabCloseAll={() => windowStore.removeAllTabs()}
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
