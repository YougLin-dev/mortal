<script lang="ts">
  import { TabBar } from '$lib/components/tabbar';
  import { ThemeSwitch, PinSwitch } from '$lib/components/ui/switch';
  import { windowStore } from '$lib/stores/window.store.svelte';
  import { GLOBAL_EVENTS } from '@/shared/types/event';
  import { getLoggerBy } from '@/shared/logging/helpers';
  import { onMount } from 'svelte';
  import SettingsTrigger from './settings-trigger.svelte';

  const logger = getLoggerBy('component', 'titlebar');

  let insertIndicatorX = $state<number | null>(null);
  let lastUpdateTime = 0;
  const UPDATE_THROTTLE = 50; // 50ms throttle

  function calculateInsertIndex(clientX: number): number {
    const tabs = windowStore.tabs;
    if (tabs.length === 0) return 0;

    const firstTab = document.querySelector('[data-id]') as HTMLElement;
    if (!firstTab) return tabs.length;

    const rect = firstTab.getBoundingClientRect();
    const tabWidth = rect.width;

    const offset = clientX - rect.left;
    const index = Math.floor(offset / tabWidth + 0.5);
    return Math.max(0, Math.min(index, tabs.length));
  }

  function handleGhostHover(event: { clientX: number; clientY: number; draggedWidth: number }) {
    const { clientX } = event;

    // Calculate insert index
    const newInsertIndex = calculateInsertIndex(clientX);

    // Calculate indicator position using uniform tab width
    const firstTab = document.querySelector('[data-id]') as HTMLElement;
    if (firstTab && windowStore.tabs.length > 0) {
      const rect = firstTab.getBoundingClientRect();
      const tabWidth = rect.width;
      insertIndicatorX = rect.left + newInsertIndex * tabWidth;
    } else {
      insertIndicatorX = null;
    }

    // Throttle updateInsertIndex calls
    const now = Date.now();
    if (now - lastUpdateTime >= UPDATE_THROTTLE) {
      lastUpdateTime = now;
      window.ghostWindowService
        .updateInsertIndex({
          windowId: windowStore.windowId,
          insertIndex: newInsertIndex
        })
        .catch((error) => {
          logger.error('Failed to update insert index: {error}', { error });
        });
    }
  }

  function handleGhostClear() {
    insertIndicatorX = null;
  }

  onMount(() => {
    window.events.on(GLOBAL_EVENTS.TAB_DRAG_GHOST_HOVER, handleGhostHover);
    window.events.on(GLOBAL_EVENTS.TAB_DRAG_GHOST_CLEAR, handleGhostClear);

    return () => {
      window.events.off(GLOBAL_EVENTS.TAB_DRAG_GHOST_HOVER, handleGhostHover);
      window.events.off(GLOBAL_EVENTS.TAB_DRAG_GHOST_CLEAR, handleGhostClear);
    };
  });
</script>

<header class="fixed top-titlebar-area-y right-0 left-titlebar-area-x z-50 flex h-full w-titlebar-w items-center" style="app-region: drag;">
  <TabBar class="w-[calc(100%-122px)]" />
  <PinSwitch class="mr-2" style="app-region: no-drag;" />
  <ThemeSwitch class="mr-2" style="app-region: no-drag;" />
  <SettingsTrigger class="mr-auto" style="app-region: no-drag;" />

  {#if insertIndicatorX !== null}
    <div
      class="pointer-events-none absolute top-0 z-[60] h-full w-0.5 bg-blue-500 transition-all duration-75"
      style="left: {insertIndicatorX}px;"
    ></div>
  {/if}
</header>
