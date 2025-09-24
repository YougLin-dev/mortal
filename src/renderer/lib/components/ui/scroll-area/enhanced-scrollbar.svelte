<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { throttle } from 'es-toolkit';

  interface Props {
    ref?: HTMLDivElement | null;
    class?: string;
    onScroll?: () => void;
    children?: import('svelte').Snippet;
    [key: string]: unknown;
  }

  let { ref = $bindable(null), class: className, onScroll: externalOnScroll, children, ...restProps }: Props = $props();

  let isScrolling = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function clearScrollingTimeout() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function handleScroll() {
    isScrolling = true;
    clearScrollingTimeout();
    timeoutId = setTimeout(() => {
      isScrolling = false;
      timeoutId = null;
    }, 1500);
  }

  const throttledInternalScrollHandler = throttle(handleScroll, 100, {
    edges: ['leading', 'trailing']
  });

  function combinedOnScroll() {
    throttledInternalScrollHandler();
    if (externalOnScroll) {
      externalOnScroll();
    }
  }

  // Cleanup on destroy
  $effect(() => {
    return () => {
      clearScrollingTimeout();
      throttledInternalScrollHandler.cancel();
    };
  });
</script>

<div
  bind:this={ref}
  class={cn('enhanced-scrollbar overflow-y-auto', className)}
  class:scrolling={isScrolling}
  onscroll={combinedOnScroll}
  {...restProps}
>
  {@render children?.()}
</div>

<style>
  .enhanced-scrollbar::-webkit-scrollbar-thumb {
    transition: background 2s ease;
    background: transparent;
  }

  .enhanced-scrollbar.scrolling::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
  }

  .enhanced-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-scrollbar-thumb-hover) !important;
  }
</style>
