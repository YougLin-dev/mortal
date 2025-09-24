<script lang="ts">
  import Header from '$lib/components/titlebar/titlebar.svelte';
  import { Router, goto, route } from '@mateothegreat/svelte5-router';
  import { type RouteResult, type RouteConfig } from '@mateothegreat/svelte5-router';

  import GeneralSettings from './general-settings.svelte';
  import ProviderSettings from './provider-settings.svelte';
  import AboutSettings from './about-settings.svelte';

  const settingsRoutes: RouteConfig[] = [
    {
      hooks: {
        pre: async (route: RouteResult) => {
          if (route.result.path.original === '/settings') {
            goto('/settings/general');
          }
        }
      }
    },
    {
      path: '/general',
      component: GeneralSettings
    },
    {
      path: '/providers',
      component: ProviderSettings
    },
    {
      path: '/about',
      component: AboutSettings
    }
  ];
</script>

<div class="flex h-screen flex-col">
  <Header />
  <main class="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
    <div class="flex h-full">
      <aside class="w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <nav class="space-y-2 p-4">
          <a
            use:route
            href="general"
            class="flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >General</a
          >
          <a
            use:route
            href="providers"
            class="flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >Providers</a
          >
          <a
            use:route
            href="about"
            class="flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >About</a
          >
        </nav>
      </aside>
      <div class="flex-1 overflow-y-auto p-8">
        <Router routes={settingsRoutes} basePath="/settings" />
      </div>
    </div>
  </main>
</div>
