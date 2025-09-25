import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import picomatch from 'picomatch';
import { MetadataCollector } from './metadata-collector';
import type { CollectedMetadata, MetadataInlinePluginOptions } from './types';

export function metadataInlinePlugin(options: MetadataInlinePluginOptions = {}): Plugin {
  const resolvedOptions = {
    servicesDir: 'src/main/services',
    virtualModuleId: 'virtual:service-metadata',
    cacheTTL: 5000,
    debug: false,
    watchPatterns: ['**/*.ts'],
    serviceDecoratorName: 'Service',
    handlerDecoratorName: 'Handler',
    tsconfigPath: 'tsconfig.json',
    ...options
  } as const;

  let cachedMetadata: CollectedMetadata | null = null;
  let lastCollectionTime = 0;
  let collector: MetadataCollector | null = null;

  const resolvedServicesDir = path.resolve(resolvedOptions.servicesDir);

  // Cache picomatch instances for better performance
  const matchers = resolvedOptions.watchPatterns.map((pattern) => picomatch(pattern, { dot: true }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = (message: string, ...args: any[]) => {
    if (resolvedOptions.debug) {
      console.log(`[metadata-inline] ${message}`, ...args);
    }
  };

  const createCollector = (): MetadataCollector => {
    if (!collector) {
      collector = new MetadataCollector({
        servicesDir: resolvedOptions.servicesDir,
        serviceDecoratorName: resolvedOptions.serviceDecoratorName,
        handlerDecoratorName: resolvedOptions.handlerDecoratorName,
        tsconfigPath: resolvedOptions.tsconfigPath,
        watchPatterns: [...resolvedOptions.watchPatterns] // Convert readonly array to mutable array
      });
    }
    return collector;
  };

  const collectMetadata = (): CollectedMetadata => {
    const now = Date.now();

    // Use cache if still fresh
    if (cachedMetadata && now - lastCollectionTime < resolvedOptions.cacheTTL) {
      log('Using cached metadata');
      return cachedMetadata;
    }

    try {
      log('Collecting service metadata from:', resolvedServicesDir);

      const metadata = createCollector().collect();
      cachedMetadata = metadata;
      lastCollectionTime = now;

      const handlerCount = metadata.services.reduce((total, s) => total + s.handlers.length, 0);
      log(`Found ${metadata.services.length} services with ${handlerCount} handlers`);
      return metadata;
    } catch (error) {
      console.error('❌ Failed to collect service metadata:', error);
      // Return fallback metadata
      return {
        services: [],
        generatedAt: new Date().toISOString()
      };
    }
  };

  const shouldCollectMetadata = (): boolean => {
    if (!fs.existsSync(resolvedServicesDir)) {
      log('Services directory does not exist:', resolvedServicesDir);
      return false;
    }

    // Check if any service file was modified recently
    try {
      const files = fs.readdirSync(resolvedServicesDir, { recursive: true }) as string[];
      const serviceFiles = files.filter((file) => matchers.some((isMatch) => isMatch(file)));

      for (const file of serviceFiles) {
        const filePath = path.join(resolvedServicesDir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs > lastCollectionTime) {
          log('File modified:', file);
          return true;
        }
      }
    } catch {
      log('Error reading service files, forcing collection');
      return true;
    }

    return !cachedMetadata || Date.now() - lastCollectionTime > resolvedOptions.cacheTTL;
  };

  const invalidateCache = () => {
    cachedMetadata = null;
    lastCollectionTime = 0;
    collector = null; // Force recreation of collector with new options
  };

  return {
    name: 'metadata-inline',

    buildStart() {
      log('Build started, clearing cache');
      invalidateCache();
    },

    resolveId(id) {
      if (id === resolvedOptions.virtualModuleId) {
        return id;
      }
      return null;
    },

    load(id) {
      if (id === resolvedOptions.virtualModuleId) {
        if (shouldCollectMetadata()) {
          const metadata = collectMetadata();
          log('Generated metadata for virtual module');
          return `export default ${JSON.stringify(metadata, null, 2)};`;
        } else if (cachedMetadata) {
          log('Using cached metadata for virtual module');
          return `export default ${JSON.stringify(cachedMetadata, null, 2)};`;
        }

        // Fallback
        console.warn('⚠️ No service metadata available, using empty fallback');
        return 'export default { services: [], generatedAt: new Date().toISOString() };';
      }
      return null;
    },

    // Watch service files for changes in dev mode
    configureServer(server) {
      if (fs.existsSync(resolvedServicesDir)) {
        const watchGlobs = resolvedOptions.watchPatterns.map((pattern) => path.join(resolvedServicesDir, pattern));

        watchGlobs.forEach((glob) => server.watcher.add(glob));
        log('Watching files:', watchGlobs);

        server.watcher.on('change', (file) => {
          const relativePath = path.relative(resolvedServicesDir, file);
          const shouldReload = matchers.some((isMatch) => isMatch(relativePath));

          if (shouldReload) {
            log('Service file changed:', path.relative(process.cwd(), file));
            invalidateCache();

            // Trigger HMR for virtual module
            const module = server.moduleGraph.getModuleById(resolvedOptions.virtualModuleId);
            if (module) {
              server.reloadModule(module);
            }
          }
        });
      } else {
        log('Services directory does not exist, skipping file watching');
      }
    }
  };
}
