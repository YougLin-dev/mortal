/// <reference types="svelte" />
/// <reference types="vite/client" />

declare namespace svelteHTML {
  interface HTMLAttributes {
    onconsider?: (event: CustomEvent) => void;
    onfinalize?: (event: CustomEvent) => void;
  }
}
