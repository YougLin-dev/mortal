<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import EnhancedScrollbar from '$lib/components/ui/scroll-area/enhanced-scrollbar.svelte';
  import { cn } from '$lib/utils';
  import { route } from '@mateothegreat/svelte5-router';
  let results: Array<{ timestamp: string; type: 'info' | 'error'; message: string }> = [];

  function addResult(type: 'info' | 'error', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    results = [...results, { timestamp, type, message }];
  }

  // SEND 测试方法
  function testSave() {
    if (typeof window !== 'undefined' && window.systemService) {
      window.systemService.save('Hello from renderer');
      addResult('info', 'Save method called with "Hello from renderer"');
    } else {
      addResult('error', 'systemService not available');
    }
  }

  function testLog() {
    if (typeof window !== 'undefined' && window.systemService) {
      window.systemService.log('This is a test log message', 'warn');
      addResult('info', 'Log method called with warn level');
    } else {
      addResult('error', 'systemService not available');
    }
  }

  function testNotify() {
    if (typeof window !== 'undefined' && window.systemService) {
      window.systemService.notify('Test Title', 'This is a test notification');
      addResult('info', 'Notify method called');
    } else {
      addResult('error', 'systemService not available');
    }
  }

  // CALL 测试方法
  async function testAdd() {
    if (typeof window !== 'undefined' && window.systemService) {
      try {
        const result = await window.systemService.add(15, 25);
        addResult('info', `Add result: 15 + 25 = ${result}`);
      } catch (error) {
        addResult('error', `Add error: ${error}`);
      }
    } else {
      addResult('error', 'systemService not available');
    }
  }

  async function testMultiply() {
    if (typeof window !== 'undefined' && window.systemService) {
      try {
        const result = await window.systemService.multiply(7, 8);
        addResult('info', `Multiply result: 7 × 8 = ${result}`);
      } catch (error) {
        addResult('error', `Multiply error: ${error}`);
      }
    } else {
      addResult('error', 'systemService not available');
    }
  }

  async function testSystemInfo() {
    if (typeof window !== 'undefined' && window.systemService) {
      try {
        const result = await window.systemService.getSystemInfo();
        addResult('info', `System info: Platform=${result.platform}, Uptime=${result.uptime.toFixed(2)}s`);
      } catch (error) {
        addResult('error', `System info error: ${error}`);
      }
    } else {
      addResult('error', 'systemService not available');
    }
  }

  async function testFetchUser() {
    if (typeof window !== 'undefined' && window.systemService) {
      try {
        const result = await window.systemService.fetchUserData('user123');
        const lastLogin = new Date(result.lastLogin).toLocaleString();
        addResult('info', `User data: ${result.name} (ID: ${result.id}), Last login: ${lastLogin}`);
      } catch (error) {
        addResult('error', `Fetch user error: ${error}`);
      }
    } else {
      addResult('error', 'systemService not available');
    }
  }
</script>

<div class="p-6">
  <div class="mx-auto max-w-4xl space-y-8">
    <!-- Header -->
    <div class="space-y-4 text-center">
      <h1 class="text-4xl font-bold tracking-tight">Mortal AI Test</h1>
      <a use:route href="/settings" class="bg-primary text-primary-foreground hover:bg-primary/90">Welcome Page</a>
    </div>

    <!-- IPC Test Suite -->
    <div class="space-y-6 rounded-lg border bg-card p-6">
      <h2 class="text-2xl font-semibold text-card-foreground">IPC Communication Test Suite</h2>

      <!-- SEND Methods Section -->
      <div class="space-y-4">
        <div class="border-b pb-2">
          <h3 class="text-lg font-medium text-muted-foreground">SEND Methods (发送消息，无返回值)</h3>
        </div>
        <div class="flex flex-wrap gap-3">
          <Button onclick={testSave} variant="secondary" class="min-w-fit flex-1">Test Save</Button>
          <Button onclick={testLog} variant="secondary" class="min-w-fit flex-1">Test Log</Button>
          <Button onclick={testNotify} variant="secondary" class="min-w-fit flex-1">Test Notify</Button>
        </div>
      </div>

      <!-- CALL Methods Section -->
      <div class="space-y-4">
        <div class="border-b pb-2">
          <h3 class="text-lg font-medium text-muted-foreground">CALL Methods (调用并等待结果)</h3>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button onclick={testAdd} variant="outline" class="w-full">Test Add</Button>
          <Button onclick={testMultiply} variant="outline" class="w-full">Test Multiply</Button>
          <Button onclick={testSystemInfo} variant="outline" class="w-full">Test System Info</Button>
          <Button onclick={testFetchUser} variant="outline" class="w-full">Test Fetch User</Button>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div class="rounded-lg border bg-card p-6">
      <h3 class="mb-4 text-xl font-semibold text-card-foreground">Results</h3>
      <EnhancedScrollbar class="max-h-96 rounded-lg bg-muted p-4">
        {#if results.length === 0}
          <p class="py-8 text-center text-muted-foreground">No results yet. Run some tests above to see output.</p>
        {:else}
          <div class="space-y-2">
            {#each results as result, i (i)}
              <div
                class={cn(
                  'rounded border bg-background p-3 font-mono text-sm',
                  result.type === 'error' ? 'border-destructive bg-destructive/5' : 'border-green-500 bg-green-50 dark:bg-green-950/20'
                )}
              >
                <div class="flex items-start gap-2">
                  <span class="shrink-0 text-muted-foreground">[{result.timestamp}]</span>
                  <span class={cn('shrink-0 font-semibold', result.type === 'error' ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                    {result.type.toUpperCase()}:
                  </span>
                  <span class="break-all">{result.message}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </EnhancedScrollbar>
    </div>
  </div>
</div>
