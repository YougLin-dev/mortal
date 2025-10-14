<script lang="ts">
  import type { Snippet } from 'svelte';
  import { link } from '$lib/router/actions/link';
  import { active } from '$lib/router/actions/active';

  let { children }: { children: Snippet } = $props();

  let count = $state(1);
</script>

<div class="flex h-screen flex-col">
  <main class="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
    <div class="flex h-full">
      <aside class="w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <nav class="space-y-2 p-4">
          <div>
            Count: {count}
            <button class="ml-2 rounded bg-blue-500 px-2 py-1 text-white" onclick={() => count++}> Increment </button>
            <button class="ml-2 rounded bg-blue-500 px-2 py-1 text-white" onclick={() => count--}> Decrement </button>
          </div>
          <a
            use:link
            use:active={{ className: 'bg-gray-100' }}
            href="#/settings/general"
            class="flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >General</a
          >
          <a
            use:link
            use:active={{ className: 'bg-gray-100' }}
            href="#/settings/providers"
            class="flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >Providers</a
          >
          <a
            use:link
            use:active={{ className: 'bg-gray-100' }}
            href="#/settings/about"
            class="flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >About</a
          >
        </nav>
      </aside>
      <div class="flex-1 overflow-y-auto p-8">
        <!-- Nested outlet - will render the child route (depth 1) -->
        {@render children()}
      </div>
    </div>
  </main>
</div>
