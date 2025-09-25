<script lang="ts">
  import { Router } from '@mateothegreat/svelte5-router';
  import type { RouteConfig } from '@mateothegreat/svelte5-router';
  import ChatPage from './pages/chat-page.svelte';
  import SettingsPage from './pages/settings/settings-page.svelte';
  import { TitleBar } from '$lib/components/titlebar';
  import { ScrollAreaEnhanced } from '$lib/components/ui/scroll-area';

  const routes: RouteConfig[] = [
    {
      path: '/',
      component: ChatPage
    },
    {
      path: '/settings',
      component: SettingsPage
    }
  ];
</script>

<TitleBar />
<ScrollAreaEnhanced class="mt-titlebar-h h-[calc(100vh-var(--spacing-titlebar-h))] overflow-auto bg-background" style="app-region: no-drag;">
  <div class="">Window State: {JSON.stringify(window.windowState)}</div>
  <div>{window.isMac}</div>
  <Router {routes} />
</ScrollAreaEnhanced>
