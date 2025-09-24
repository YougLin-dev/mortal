<script lang="ts">
  import { route } from '@mateothegreat/svelte5-router';
</script>

<header class="h-titlebar-h w-titlebar-w" style="app-region: drag;">
  <div class="flex h-full items-center justify-between px-4">
    <h1 class="text-lg font-semibold text-gray-100 dark:text-gray-900">Mortal Chat</h1>
    <nav class="flex items-center gap-1">
      <a
        use:route
        href="/"
        style="app-region: no-drag;"
        class="rounded-md px-3 py-1.5 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-300 dark:text-gray-700 dark:hover:bg-gray-300"
        >Chat</a
      >
      <a
        use:route
        href="/settings"
        style="app-region: no-drag;"
        class="rounded-md px-3 py-1.5 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-300 dark:text-gray-700 dark:hover:bg-gray-300"
        >Settings</a
      >
    </nav>
  </div>
</header>
