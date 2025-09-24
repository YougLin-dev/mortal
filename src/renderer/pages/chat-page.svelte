<script lang="ts">
  import Registry from '$lib/components/registry/registry.svelte';
  import TitleBar from '$lib/components/titlebar/titlebar.svelte';
</script>

<div class="flex h-screen flex-col">
  <TitleBar />
  <main class="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
    <Registry />
  </main>
</div>
