<script lang="ts">
  import { t } from '$lib/i18n';
  import { link } from '$lib/router/actions/link';
</script>

<div class="flex h-full w-full flex-col items-center justify-center py-4">
  <h1 class="text-4xl font-bold tracking-tight">{t('welcome.title')}</h1>
  <p class="text-lg text-muted-foreground">{t('welcome.subtitle')}</p>
  <a use:link href="#/chat" class="bg-primary text-primary-foreground hover:bg-primary/90">{t('welcome.learnMore')}</a>
</div>
