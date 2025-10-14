<script lang="ts">
  import type { RouterOptions, RouterState } from '../types';
  import { createRouter, type Router as CoreRouter } from '../router';
  import { setRouterContext } from '../context';
  import Route from './route.svelte';

  type Props = {
    options: RouterOptions;
  };

  let { options }: Props = $props();

  const router: CoreRouter = createRouter({ hash: true, ...options });

  // Create reactive mirror of router state
  const reactiveState = $state<RouterState>({ ...router.state });

  // Override state getter directly on router instance to avoid split-brain
  Object.defineProperty(router, 'state', {
    get: () => reactiveState,
    enumerable: true,
    configurable: true
  });

  setRouterContext(router);

  // Unified lifecycle management in single effect
  $effect(() => {
    const unsub = router.subscribe((newState) => {
      // Update properties individually to minimize reactivity triggers
      reactiveState.path = newState.path;
      reactiveState.matches = newState.matches;
    });
    router.mount();
    return () => {
      unsub();
      router.destroy();
    };
  });
</script>

<!-- Default renders the full route chain; parent layouts can place <Route /> for nested views -->
<Route depth={0} />
