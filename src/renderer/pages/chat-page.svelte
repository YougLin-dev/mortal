<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import EnhancedScrollbar from '$lib/components/ui/scroll-area/enhanced-scrollbar.svelte';
  import LanguageSelector from '$lib/components/selector/language-selector.svelte';
  import { createNamespacedT } from '$lib/i18n';
  import { cn } from '$lib/utils';
  import { route, type RouteResult } from '@mateothegreat/svelte5-router';

  const t = createNamespacedT('test');

  let results: Array<{ timestamp: string; type: 'info' | 'error'; message: string }> = $state([]);

  function addResult(type: 'info' | 'error', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    results = [...results, { timestamp, type, message }];
  }

  // SEND 测试方法
  function testSave() {
    if (typeof window !== 'undefined' && window.systemService) {
      window.systemService.save('Hello from renderer');
      addResult('info', t('messages.saveMethodCalled'));
    } else {
      addResult('error', t('messages.serviceNotAvailable'));
    }
  }

  function testLog() {
    if (typeof window !== 'undefined' && window.systemService) {
      window.systemService.log('This is a test log message', 'warn');
      addResult('info', t('messages.logMethodCalled'));
    } else {
      addResult('error', t('messages.serviceNotAvailable'));
    }
  }

  function testNotify() {
    if (typeof window !== 'undefined' && window.systemService) {
      window.systemService.notify('Test Title', 'This is a test notification');
      addResult('info', t('messages.notifyMethodCalled'));
    } else {
      addResult('error', t('messages.serviceNotAvailable'));
    }
  }

  async function testMultiply() {
    if (typeof window !== 'undefined' && window.systemService) {
      try {
        const result = await window.systemService.multiply(7, 8);
        addResult('info', t('messages.multiplyResult', { a: 7, b: 8, result }));
      } catch (error) {
        addResult('error', t('messages.multiplyError', { error: String(error) }));
      }
    } else {
      addResult('error', t('messages.serviceNotAvailable'));
    }
  }

  async function testSystemInfo() {
    if (typeof window !== 'undefined' && window.systemService) {
      try {
        const result = await window.systemService.getSystemInfo();
        addResult('info', t('messages.systemInfo', { platform: result.platform, uptime: result.uptime.toFixed(2) }));
      } catch (error) {
        addResult('error', t('messages.systemInfoError', { error: String(error) }));
      }
    } else {
      addResult('error', t('messages.serviceNotAvailable'));
    }
  }

  async function testFetchUser() {
    if (typeof window !== 'undefined' && window.systemService) {
      try {
        const result = await window.systemService.fetchUserData('user123');
        const lastLogin = new Date(result.lastLogin).toLocaleString();
        addResult('info', t('messages.userData', { name: result.name, id: result.id, lastLogin }));
      } catch (error) {
        addResult('error', t('messages.fetchUserError', { error: String(error) }));
      }
    } else {
      addResult('error', t('messages.serviceNotAvailable'));
    }
  }

  let { route: r }: { route: RouteResult } = $props();
</script>

<div class="p-6">
  <div class="mx-auto max-w-4xl space-y-8">
    <!-- Header -->
    <div class="space-y-4 text-center">
      <h1 class="text-4xl font-bold tracking-tight">
        {t('title')}: {r.result.path.params?.['id']}
      </h1>
      <div class="flex items-center justify-center gap-4">
        <a use:route href="/settings" class="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          {t('settingsPage')}
        </a>
        <a use:route href="/welcome" class="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          {t('welcomePage')}
        </a>
        <LanguageSelector />
      </div>
    </div>
    <div class="">{t('windowState')}: {JSON.stringify(window.windowState)}</div>
    <div>{window.isMac}</div>

    <!-- IPC Test Suite -->
    <div class="space-y-6 rounded-lg border bg-card p-6">
      <h2 class="text-2xl font-semibold text-card-foreground">{t('ipcTestSuite')}</h2>

      <!-- SEND Methods Section -->
      <div class="space-y-4">
        <div class="border-b pb-2">
          <h3 class="text-lg font-medium text-muted-foreground">{t('sendMethods')}</h3>
        </div>
        <div class="flex flex-wrap gap-3">
          <Button onclick={testSave} variant="secondary" class="min-w-fit flex-1">{t('testSave')}</Button>
          <Button onclick={testLog} variant="secondary" class="min-w-fit flex-1">{t('testLog')}</Button>
          <Button onclick={testNotify} variant="secondary" class="min-w-fit flex-1">{t('testNotify')}</Button>
        </div>
      </div>

      <!-- CALL Methods Section -->
      <div class="space-y-4">
        <div class="border-b pb-2">
          <h3 class="text-lg font-medium text-muted-foreground">{t('callMethods')}</h3>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button onclick={testMultiply} variant="outline" class="w-full">{t('testMultiply')}</Button>
          <Button onclick={testSystemInfo} variant="outline" class="w-full">{t('testSystemInfo')}</Button>
          <Button onclick={testFetchUser} variant="outline" class="w-full">{t('testFetchUser')}</Button>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div class="rounded-lg border bg-card p-6">
      <h3 class="mb-4 text-xl font-semibold text-card-foreground">{t('results')}</h3>
      <EnhancedScrollbar class="max-h-96 rounded-lg bg-muted p-4">
        {#if results.length === 0}
          <p class="py-8 text-center text-muted-foreground">{t('noResults')}</p>
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
