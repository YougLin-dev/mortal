<script lang="ts" module>
  import { Tooltip as TooltipPrimitive } from 'bits-ui';

  export type TooltipButtonProps = ButtonProps & TooltipPrimitive.ContentProps & { tooltip: string };
</script>

<script lang="ts">
  import { buttonVariants, type ButtonProps } from '$lib/components/ui/button';
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '$lib/components/ui/tooltip/index.js';
  import { cn } from '$lib/utils.js';

  const {
    tooltip,
    side = 'top',
    sideOffset = 2,
    variant = 'ghost',
    size = 'icon',
    class: className,
    style,
    disabled,
    onclick,
    children
  }: TooltipButtonProps = $props();
</script>

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger class={cn('group rounded-sm', buttonVariants({ variant, size }), className)} {disabled} {onclick} {style}>
      {@render children?.()}
    </TooltipTrigger>
    <TooltipContent {side} arrowClasses="hidden" {sideOffset}>
      {tooltip}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
