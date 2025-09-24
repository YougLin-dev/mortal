<script lang="ts">
  import { registry } from '@mateothegreat/svelte5-router';
</script>

<div>
  {#each registry.instances.entries() as [id, instance] (id)}
    <div>
      <pre>id: {id}</pre>
      <pre>routes: {instance.routes.size}</pre>
      <pre>current: {instance.current?.path || '<default>'}</pre>
      <pre>navigating: {instance.navigating ? 'yes' : 'no'}</pre>
    </div>
  {/each}
</div>
