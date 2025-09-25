<script lang="ts" module>
  interface Props {
    tab: Tab;
    stretch?: boolean;
    closable: boolean;
    onTabClick: (tab: Tab) => void;
    onTabClose: (tab: Tab) => void;
    onTabCloseAll: () => void;
    class?: string;
  }
</script>

<script lang="ts">
  import { TooltipButton } from '$lib/components/ui/tooltip-button';
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
  import { cn } from '$lib/utils';
  import type { Tab } from '@/shared/types/window';
  import { CircleX, X } from '@lucide/svelte';

  const { tab, stretch = false, closable, onTabClick, onTabClose, onTabCloseAll, class: className }: Props = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger
    class={cn(
      'relative flex h-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg px-2 text-sm',
      stretch ? 'w-auto min-w-4' : 'w-32',
      tab.isActive
        ? 'bg-tabbar-active text-tabbar-active-foreground'
        : 'transition-colors hover:bg-tabbar-accent  hover:text-tabbar-accent-foreground',
      className
    )}
    style="app-region: no-drag;"
    onclick={() => onTabClick(tab)}
    role="button"
    tabindex={0}
  >
    <div class="contents">
      <span class="max-w-48 min-w-0 flex-1 truncate">{tab.name}</span>
      {#if closable}
        <TooltipButton
          tooltip={tab.name}
          side="bottom"
          variant="ghost"
          size="icon"
          class={cn('h-auto w-auto shrink-0 rounded-full bg-transparent p-1 transition-colors')}
          onclick={(e) => {
            e.stopPropagation();
            onTabClose(tab);
          }}
        >
          <X class="size-3" />
        </TooltipButton>
      {/if}
    </div>
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-48">
    <ContextMenu.Item onclick={() => onTabClose(tab)} disabled={!closable}>
      <X class="mr-2 h-4 w-4" />
      关闭
    </ContextMenu.Item>
    <ContextMenu.Item onclick={() => onTabCloseAll()} disabled={!closable}>
      <CircleX class="mr-2 h-4 w-4" />
      关闭全部
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
