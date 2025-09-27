<script lang="ts">
  import { TabBar } from '$lib/components/tabbar';
  import { ThemeSwitch, PinSwitch } from '$lib/components/ui/switch';
</script>

<header class="fixed top-0 right-0 left-0 z-50 flex h-titlebar-h w-titlebar-w items-center" style="app-region: drag;">
  <TabBar class="w-[calc(var(--spacing-titlebar-w)-82px)]" />
  <PinSwitch class="mr-2" style="app-region: no-drag;" />
  <ThemeSwitch class="mr-auto" style="app-region: no-drag;" />
</header>
