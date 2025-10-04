<script lang="ts">
  import { t } from '$lib/i18n';
  import { route } from '@mateothegreat/svelte5-router';

  let streamData1 = $state<Array<{ count: number; timestamp: number }>>([]);
  let streamData2 = $state<Array<{ count: number; timestamp: number }>>([]);
  let isStreaming1 = $state(false);
  let isStreaming2 = $state(false);
  let streamStatus1 = $state<'idle' | 'streaming' | 'completed' | 'error'>('idle');
  let streamStatus2 = $state<'idle' | 'streaming' | 'completed' | 'error'>('idle');
  let errorMessage1 = $state('');
  let errorMessage2 = $state('');

  async function handleStream(streamId: 1 | 2) {
    const streamData = streamId === 1 ? streamData1 : streamData2;
    const setStreamData = (data: typeof streamData1) => {
      if (streamId === 1) streamData1 = data;
      else streamData2 = data;
    };
    const setIsStreaming = (value: boolean) => {
      if (streamId === 1) isStreaming1 = value;
      else isStreaming2 = value;
    };
    const setStreamStatus = (value: typeof streamStatus1) => {
      if (streamId === 1) streamStatus1 = value;
      else streamStatus2 = value;
    };
    const setErrorMessage = (value: string) => {
      if (streamId === 1) errorMessage1 = value;
      else errorMessage2 = value;
    };

    setStreamData([]);
    setIsStreaming(true);
    setStreamStatus('streaming');
    setErrorMessage('');

    try {
      const response = await window.ipcFetch('/api/stream-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ max: 10 })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setStreamStatus('completed');
          setIsStreaming(false);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        try {
          const data = JSON.parse(chunk);
          setStreamData([...streamData, data]);
        } catch (e) {
          console.warn('Failed to parse chunk:', chunk, e);
        }
      }
    } catch (error) {
      setStreamStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setIsStreaming(false);
    }
  }

  async function startBothStreams() {
    handleStream(1);
    handleStream(2);
  }

  function cleanup() {
    streamData1 = [];
    streamData2 = [];
    streamStatus1 = 'idle';
    streamStatus2 = 'idle';
    isStreaming1 = false;
    isStreaming2 = false;
    errorMessage1 = '';
    errorMessage2 = '';
  }

  async function testHello() {
    try {
      const response = await window.ipcFetch('/api/hello');
      const data = await response.json();
      console.log('Hello response:', data);
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Hello error:', error);
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-6 py-4">
  <div class="text-center">
    <h1 class="text-4xl font-bold tracking-tight">{t('welcome.title')}</h1>
    <p class="text-lg text-muted-foreground">{t('welcome.subtitle')}</p>
  </div>

  <div class="w-full max-w-4xl space-y-4 rounded-lg border p-6">
    <h2 class="text-2xl font-semibold">IPC Fetch Demo - Dual Streams</h2>

    <div class="flex gap-2">
      <button
        class="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        onclick={() => handleStream(1)}
        disabled={isStreaming1}
      >
        {isStreaming1 ? 'Stream 1...' : 'Start Stream 1'}
      </button>

      <button
        class="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        onclick={() => handleStream(2)}
        disabled={isStreaming2}
      >
        {isStreaming2 ? 'Stream 2...' : 'Start Stream 2'}
      </button>

      <button
        class="rounded bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
        onclick={startBothStreams}
        disabled={isStreaming1 || isStreaming2}
      >
        Start Both
      </button>

      <button class="rounded border px-4 py-2 hover:bg-muted" onclick={cleanup} disabled={isStreaming1 || isStreaming2}> Clear </button>

      <button class="rounded border border-primary px-4 py-2 text-primary hover:bg-primary/10" onclick={testHello}> Test Hello </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <!-- Stream 1 -->
      <div class="space-y-2">
        <h3 class="font-semibold">Stream 1</h3>
        <div class="text-sm font-medium">
          Status: <span class="font-mono">{streamStatus1}</span>
        </div>

        {#if errorMessage1}
          <div class="rounded bg-destructive/10 p-2 text-sm text-destructive">{errorMessage1}</div>
        {/if}

        <div class="max-h-64 space-y-1 overflow-y-auto rounded border p-3">
          {#if streamData1.length === 0}
            <p class="text-sm text-muted-foreground">No data yet...</p>
          {:else}
            {#each streamData1 as item (item.timestamp)}
              <div class="flex justify-between text-sm">
                <span class="font-mono">Count: {item.count}</span>
                <span class="text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Stream 2 -->
      <div class="space-y-2">
        <h3 class="font-semibold">Stream 2</h3>
        <div class="text-sm font-medium">
          Status: <span class="font-mono">{streamStatus2}</span>
        </div>

        {#if errorMessage2}
          <div class="rounded bg-destructive/10 p-2 text-sm text-destructive">{errorMessage2}</div>
        {/if}

        <div class="max-h-64 space-y-1 overflow-y-auto rounded border p-3">
          {#if streamData2.length === 0}
            <p class="text-sm text-muted-foreground">No data yet...</p>
          {:else}
            {#each streamData2 as item (item.timestamp)}
              <div class="flex justify-between text-sm">
                <span class="font-mono">Count: {item.count}</span>
                <span class="text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>

  <a use:route href="/chat" class="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">{t('welcome.learnMore')}</a>
</div>
