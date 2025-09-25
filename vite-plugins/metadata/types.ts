export interface ServiceMetadata {
  serviceName: string;
  handlers: string[];
}

export interface CollectedMetadata {
  services: ServiceMetadata[];
  generatedAt: string;
}

export interface MetadataInlinePluginOptions {
  /**
   * Services directory path relative to project root
   * @default 'src/main/services'
   */
  servicesDir?: string;

  /**
   * Virtual module ID for importing metadata
   * @default 'virtual:service-metadata'
   */
  virtualModuleId?: string;

  /**
   * Cache TTL in milliseconds for metadata collection
   * @default 5000
   */
  cacheTTL?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Watch patterns for service files (glob patterns)
   * @default ['**\/*.ts']
   */
  watchPatterns?: string[];

  /**
   * Service decorator name to look for
   * @default 'Service'
   */
  serviceDecoratorName?: string;

  /**
   * Handler decorator name to look for
   * @default 'Handler'
   */
  handlerDecoratorName?: string;

  /**
   * TypeScript config path
   * @default 'tsconfig.json'
   */
  tsconfigPath?: string;
}
