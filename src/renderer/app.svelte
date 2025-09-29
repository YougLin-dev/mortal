<script lang="ts">
  import { Router } from '@mateothegreat/svelte5-router';
  import type { RouteConfig } from '@mateothegreat/svelte5-router';
  import ChatPage from './pages/chat-page.svelte';
  import SettingsPage from './pages/settings/settings-page.svelte';
  import { TitleBar } from '$lib/components/titlebar';
  import { ScrollAreaEnhanced } from '$lib/components/ui/scroll-area';
  import WelcomePage from './pages/welcome-page.svelte';

  const routes: RouteConfig[] = [
    {
      path: '/welcome',
      component: WelcomePage
    },
    {
      path: '/chat(?:/(?<id>.*))?',
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
  <Router {routes} />
</ScrollAreaEnhanced>
