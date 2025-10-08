<script lang="ts">
  import { Router } from '@mateothegreat/svelte5-router';
  import type { RouteConfig } from '@mateothegreat/svelte5-router';
  import ChatPage from './pages/chat-page.svelte';
  import SettingsPage from './pages/settings/settings-page.svelte';
  import WelcomePage from './pages/welcome-page.svelte';

  const routes: RouteConfig[] = [
    {
      path: '',
      component: WelcomePage
    },
    {
      path: 'welcome',
      component: WelcomePage
    },
    {
      path: 'chat(?:/(?<id>.*))?',
      component: ChatPage
    },
    {
      path: 'settings',
      component: SettingsPage
    }
  ];
</script>

<!-- Main content with top padding to avoid titlebar overlay -->
<main class="h-screen w-screen overflow-hidden rounded-md bg-background">
  <Router id="content-router" {routes} />
</main>
