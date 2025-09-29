<script lang="ts">
  import { route } from '@mateothegreat/svelte5-router';
</script>

<div class="flex h-full w-full flex-col items-center justify-center py-4">
  <h1 class="text-4xl font-bold tracking-tight">Welcome to Mortal AI</h1>
  <p class="text-lg text-muted-foreground">This is the welcome page. Use the navigation to explore the app.</p>
  <a use:route href="/chat" class="bg-primary text-primary-foreground hover:bg-primary/90">Go to Chat Page</a>
</div>
