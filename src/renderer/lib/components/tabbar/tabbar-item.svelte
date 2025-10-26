<script lang="ts" module>
  interface Props {
    tab: Tab;
    stretch?: boolean;
    closable: boolean;
    onTabClick: (tab: Tab) => void;
    onTabClose: (tab: Tab) => void;
    class?: string;
  }
</script>

<script lang="ts">
  import { t } from '$lib/i18n';

  import { cn } from '$lib/utils';
  import type { Tab } from '@/shared/types/window';
  import { X } from '@lucide/svelte';

  const { tab, stretch = false, closable, onTabClick, onTabClose, class: className }: Props = $props();

  async function handleContextMenu(e: MouseEvent) {
    e.preventDefault();

    if (!closable) return;

    await window.shellWindowService.showTabContextMenu({
      tabId: tab.id,
      template: [
        { action: 'close', label: t('tabbar.close') },
        { action: 'close-all', label: t('tabbar.close_all') }
      ]
    });
  }
</script>

<div
  role="button"
  tabindex={0}
  draggable={true}
  data-tab-draggable
  class={cn(
    'relative flex h-full cursor-pointer items-center justify-center overflow-hidden rounded-md px-2 text-sm ',
    stretch ? 'w-auto min-w-4' : 'w-32',
    tab.isActive ? 'bg-tabbar-active text-tabbar-active-foreground' : 'transition-colors hover:bg-tabbar-accent hover:text-tabbar-accent-foreground',
    className
  )}
  style="app-region: no-drag;"
  onclick={() => onTabClick(tab)}
  onkeydown={(e) => e.key === 'Enter' && onTabClick(tab)}
  oncontextmenu={handleContextMenu}
>
  <div class="contents">
    <span class="max-w-48 min-w-0 flex-1 truncate select-none" title={tab.name}>{tab.name}</span>
    {#if closable}
      <button
        title="关闭标签页"
        class={cn(
          'h-auto w-auto shrink-0 rounded-md bg-transparent p-1 transition-colors hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50'
        )}
        onclick={(e) => {
          e.stopPropagation();
          onTabClose(tab);
        }}
      >
        <X class="size-3" />
      </button>
    {/if}
  </div>
</div>
