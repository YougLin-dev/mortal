/**
 * Creates a root effect that will not be automatically cleaned up when the parent component is destroyed.
 * Useful for creating global side effects that should persist throughout the application lifecycle.
 *
 * @param effectFn - The effect function to run
 * @returns A cleanup function to manually destroy the effect
 *
 * @example
 * ```ts
 * const cleanup = createRootEffect(() => {
 *   $effect(() => {
 *     console.log('This effect runs at root level');
 *   });
 * });
 *
 * // Later, if needed:
 * cleanup();
 * ```
 */
export function createRootEffect(effectFn: () => void) {
  return $effect.root(() => {
    $effect(effectFn);
  });
}
