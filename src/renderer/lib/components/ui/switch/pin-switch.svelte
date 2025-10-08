<script lang="ts">
  import PinIcon from '@lucide/svelte/icons/pin';
  import PinOffIcon from '@lucide/svelte/icons/pin-off';
  import { buttonVariants, type ButtonProps } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';
  import { windowStore } from '$lib/stores/window.store.svelte';

  const { class: className, style = undefined }: ButtonProps = $props();

  async function togglePin() {
    windowStore.toggleAlwaysOnTop();
  }
</script>

<button
  title="将当前窗口置于其他窗口之上"
  onclick={togglePin}
  {style}
  class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full hover:bg-[#E8E8E8] hover:dark:bg-[#2C2C2C]', className)}
>
  {#if windowStore.isAlwaysOnTop}
    <PinIcon class="h-[1.2rem] w-[1.2rem]" />
  {:else}
    <PinOffIcon class="h-[1.2rem] w-[1.2rem]" />
  {/if}
</button>
