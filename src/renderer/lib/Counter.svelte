<script lang="ts">
  import { Button } from './components/ui/button';

  let count: number = $state(0);
  const increment = (): void => {
    count += 1;
  };
</script>

<Button onclick={increment}>
  count is {count}
</Button>
