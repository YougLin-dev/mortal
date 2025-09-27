<script lang="ts">
  import PinIcon from '@lucide/svelte/icons/pin';
  import PinOffIcon from '@lucide/svelte/icons/pin-off';
  import { Button, type ButtonProps } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';
  import { toggleAlwaysOnTop, windowStore } from '$lib/stores/window.state.svelte';

  const { class: className, style = undefined }: ButtonProps = $props();

  async function togglePin() {
    toggleAlwaysOnTop();
  }
</script>

<Button onclick={togglePin} variant="ghost" size="icon" {style} class={cn('rounded-full hover:bg-[#E8E8E8] hover:dark:bg-[#2C2C2C]', className)}>
  {#if windowStore.current.isAlwaysOnTop}
    <PinIcon class="h-[1.2rem] w-[1.2rem]" />
  {:else}
    <PinOffIcon class="h-[1.2rem] w-[1.2rem]" />
  {/if}
</Button>
