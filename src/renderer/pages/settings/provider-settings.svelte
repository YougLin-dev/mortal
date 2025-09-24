<script lang="ts">
</script>

<div class="space-y-8">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Provider Settings</h2>
  <div class="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div class="space-y-2">
      <label for="default-provider" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Provider</label>
      <select
        id="default-provider"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="google">Google</option>
      </select>
    </div>
    <div class="space-y-2">
      <label for="api-key" class="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
      <input
        type="password"
        id="api-key"
        placeholder="Enter your API key"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
      />
    </div>
    <div>
      <button class="rounded-lg bg-green-500 px-4 py-2 font-medium text-white transition-colors hover:bg-green-600">Test Connection</button>
    </div>
  </div>

  <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Configured Providers</h3>
    <div class="space-y-3">
      <div class="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <span class="font-medium text-gray-900 dark:text-gray-100">OpenAI</span>
        <span
          class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300"
          >Connected</span
        >
      </div>
      <div class="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
        <span class="font-medium text-gray-900 dark:text-gray-100">Anthropic</span>
        <span
          class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300"
          >Disconnected</span
        >
      </div>
    </div>
  </div>
</div>
