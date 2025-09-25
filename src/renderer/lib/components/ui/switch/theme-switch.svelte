<script lang="ts">
  import SunIcon from '@lucide/svelte/icons/sun';
  import MoonIcon from '@lucide/svelte/icons/moon';
  import { Button, type ButtonProps } from '$lib/components/ui/button';
  import { transitionState, toggleTheme } from '$lib/stores/theme.state.svelte';
  import { cn } from '$lib/utils';

  const { class: className, style = undefined }: ButtonProps = $props();
</script>

<Button
  onclick={toggleTheme}
  variant="ghost"
  size="icon"
  {style}
  class={cn(
    'rounded-full transition-none hover:bg-[#E8E8E8] hover:dark:bg-[#2C2C2C]',
    transitionState.isTransitioning && 'hover:bg-transparent hover:dark:bg-transparent',
    className
  )}
>
  <SunIcon class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-[rotate] dark:scale-0 dark:-rotate-90" />
  <MoonIcon class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-[rotate] dark:scale-100 dark:rotate-0" />
</Button>
