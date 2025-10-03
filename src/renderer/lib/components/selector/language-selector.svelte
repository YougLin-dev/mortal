<script lang="ts">
  import { i18nStore, SUPPORTED_LOCALES } from '$lib/i18n';
  import * as Select from '$lib/components/ui/select';
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
  }

  const { class: className }: Props = $props();
</script>

<Select.Root
  type="single"
  value={i18nStore.locale}
  onValueChange={(value) => {
    if (value) {
      i18nStore.locale = value;
    }
  }}
>
  <Select.Trigger class={cn('w-40', className)}>
    {i18nStore.displayText}
  </Select.Trigger>
  <Select.Content>
    {#each SUPPORTED_LOCALES as localeItem (localeItem.code)}
      <Select.Item value={localeItem.code} label={localeItem.nativeName}>
        <div class="flex items-center gap-2">
          <span>{localeItem.flag}</span>
          <span>{localeItem.nativeName}</span>
        </div>
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
