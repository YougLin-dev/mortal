<script lang="ts">
  import { useRouter } from '$lib/router/context';

  const router = $derived(useRouter());
</script>

<div>
  <div>
    <pre>current path: {router.state?.path || '<unknown>'}</pre>
    <pre>routes: {router.state?.matches.length || 0}</pre>
  </div>
</div>
