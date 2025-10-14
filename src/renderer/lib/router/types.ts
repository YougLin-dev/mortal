import type { Component as SvelteComponent } from 'svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Component = SvelteComponent<any>;

export type GuardResult = boolean | string | { name?: string; path?: string; params?: Record<string, string>; replace?: boolean };

export type Guard = (to: Matched, from: Matched | null) => Promise<GuardResult> | GuardResult;

export type RouteRecord = {
  name?: string;
  path: string; // can be absolute (/settings) or relative (general) if nested
  component?: Component; // optional for pure redirect/layout containers
  children?: RouteRecord[];
  redirect?: { name?: string; path?: string; params?: Record<string, string> };
  beforeEnter?: Guard | Guard[];
  meta?: Record<string, unknown>;
};

export type RouterOptions = {
  routes: RouteRecord[];
  hash?: boolean; // default true for Electron
  base?: string; // not used in hash mode
};

export type CompiledRecord = {
  name?: string;
  fullPath: string; // absolute path (/settings/general)
  component?: Component;
  meta?: Record<string, unknown>;
  redirect?: RouteRecord['redirect'];
  beforeEnter: Guard[];
  parent?: CompiledRecord | null;
  // matching
  re: RegExp;
  keys: string[]; // param names
  score: number; // specificity
};

export type Matched = {
  path: string; // normalized path like /settings/general
  params: Record<string, string>;
  record: CompiledRecord;
};

export type RouterState = {
  path: string;
  matches: Matched[]; // root -> leaf
};
