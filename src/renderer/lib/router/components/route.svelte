<script lang="ts">
  import { useRouter } from '../context';
  import route from './route.svelte';

  type Props = {
    depth?: number;
  };

  const MAX_DEPTH = 50;

  let { depth = 0 }: Props = $props();

  const router = useRouter();
  // reactive derivations using runes
  const matches = $derived(router.state.matches);
  const m = $derived(matches[depth]);
  const nextExists = $derived(matches.length > depth + 1);
  const canRecurse = $derived(nextExists && depth < MAX_DEPTH);
  const component = $derived(m?.record.component);
  const ctx = {
    get component() {
      return component;
    },
    route
  };
</script>

{#if ctx.component}
  <ctx.component>
    {#if canRecurse}
      <ctx.route depth={depth + 1} />
    {/if}
  </ctx.component>
{:else if canRecurse}
  <ctx.route depth={depth + 1} />
{/if}
