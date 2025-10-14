<script lang="ts">
  import Router from '$lib/router/components/router.svelte';
  import { routes } from './routes';

  const options = { routes, hash: true } as const;
</script>

<!-- Main content with top padding to avoid titlebar overlay -->
<main class="mx-2 mb-2 h-[calc(100vh-var(--spacing)*2)] w-[calc(100vw-var(--spacing)*4)] overflow-hidden rounded-md bg-background">
  <Router {options} />
</main>
