import { MediaQuery } from 'svelte/reactivity';

const DEFAULT_MOBILE_BREAKPOINT = 768;

/**
 * IsMobile is a reactive media query class for detecting mobile viewports.
 *
 * @example
 * ```ts
 * const isMobile = new IsMobile();
 * if (isMobile.current) {
 *   // Mobile viewport
 * }
 * ```
 */
export class IsMobile extends MediaQuery {
  constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
    super(`max-width: ${breakpoint - 1}px`);
  }
}
