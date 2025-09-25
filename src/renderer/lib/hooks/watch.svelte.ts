export function watchRoot(effectFn: () => void) {
  return $effect.root(() => {
    $effect(effectFn);
  });
}
