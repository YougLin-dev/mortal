<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';
  import { DefaultChatTransport } from 'ai';

  let input = '';
  const chat = new Chat({
    // @ts-expect-error no-error
    transport: new DefaultChatTransport({ api: '/api/chat', fetch: window.ipcFetch })
  });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    chat.sendMessage({ text: input });
    input = '';
  }
</script>

<main class="flex h-full flex-col bg-background">
  <!-- Messages Container -->
  <div class="flex-1 overflow-y-auto px-4 py-6">
    <div class="mx-auto max-w-3xl space-y-4">
      {#if chat.error}
        <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div class="mb-1 text-sm font-semibold text-destructive">错误</div>
          <div class="text-sm text-destructive/90">{chat.error.message}</div>
        </div>
      {/if}

      {#each chat.messages as message, messageIndex (messageIndex)}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div
            class="max-w-[80%] rounded-2xl px-4 py-2.5 {message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}"
          >
            <div class="mb-1 text-xs font-medium opacity-70">
              {message.role === 'user' ? '你' : '助手'}
            </div>
            <div class="space-y-2">
              {#each message.parts as part, partIndex (partIndex)}
                {#if part.type === 'text'}
                  <div class="text-sm break-words whitespace-pre-wrap">{part.text}</div>
                {/if}
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Input Container -->
  <div class="border-t bg-background px-4 py-4">
    <div class="mx-auto max-w-3xl">
      <form onsubmit={handleSubmit} class="flex gap-2">
        <input
          bind:value={input}
          type="text"
          placeholder="输入消息..."
          class="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          class="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          发送
        </button>
        <button type="button" onclick={() => chat.stop()} class="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
          暂停
        </button>
      </form>
    </div>
  </div>
</main>
