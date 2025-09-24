<script lang="ts">
  import { Router } from '@mateothegreat/svelte5-router';
  import type { RouteConfig } from '@mateothegreat/svelte5-router';
  import ChatPage from './pages/chat-page.svelte';
  import SettingsPage from './pages/settings/settings-page.svelte';

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

<Router {routes} />
