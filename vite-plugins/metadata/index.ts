/**
 * Metadata Plugin for Mortal AI
 *
 * This plugin collects service metadata at build time and inlines it as a virtual module
 * for secure IPC bridge generation without importing Node.js dependencies in preload.
 */

export { metadataInlinePlugin } from './metadata-inline';
export { MetadataCollector, type MetadataCollectorOptions } from './metadata-collector';

export type { ServiceMetadata, CollectedMetadata, MetadataInlinePluginOptions } from './types';
