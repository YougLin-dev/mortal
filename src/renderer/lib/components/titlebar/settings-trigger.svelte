<script lang="ts">
  import { buttonVariants, type ButtonProps } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';
  import { windowStore } from '$lib/stores/window.store.svelte';
  import { Settings } from '@lucide/svelte';

  const { class: className, style = undefined }: ButtonProps = $props();

  async function handleClick() {
    windowStore.addSettingTab();
  }
</script>

<button
  title="打开设置页面"
  onclick={handleClick}
  {style}
  class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full hover:bg-[#E8E8E8] hover:dark:bg-[#2C2C2C]', className)}
>
  <Settings class="h-[1.2rem] w-[1.2rem]" />
</button>
