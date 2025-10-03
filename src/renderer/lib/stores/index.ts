/**
 * Unified store exports
 *
 * This file provides a single entry point for all application stores.
 * All stores follow a consistent class-based pattern with:
 * - `state` property for full state access
 * - Specific getters for common properties
 * - Action methods for state mutations
 */

// Core exports
export { PersistedStore } from './core/persisted-store.svelte';
export { createRootEffect } from './core/create-root-effect.svelte';
export type { IStore, IPersistedStore } from './core/types';

// Store instances
export { windowStore } from './window.store.svelte';
export { themeStore } from './theme.store.svelte';
export { i18nStore } from '../i18n';
