import { net, protocol } from 'electron';
import { extname, join, normalize, resolve } from 'path';
import { pathToFileURL } from 'node:url';

export class AppProtocol {
  private readonly schema: string;
  private readonly host: string;
  private readonly preloadFileBasePath: string;
  private readonly rendererFileBasePath: string;

  constructor(schema: string, host: string, preloadFileBasePath: string, rendererFileBasePath: string) {
    this.schema = schema;
    this.host = host;
    this.preloadFileBasePath = preloadFileBasePath;
    this.rendererFileBasePath = rendererFileBasePath;

    protocol.registerSchemesAsPrivileged([{ scheme: this.schema, privileges: { standard: true, secure: true } }]);
  }

  public getPreloadFile(): string {
    return join(this.preloadFileBasePath, 'preload.js');
  }

  public getLoadUrl(): string {
    return `${this.schema}://${this.host}`;
  }

  public setupHandler() {
    protocol.handle(this.schema, (request) => {
      const url = new URL(request.url);
      // Normalize and sanitize the requested path
      const rawPathname = url.pathname || '/';
      const isRoot = rawPathname === '/';
      const decodedPath = decodeURIComponent(rawPathname.replace(/^\//, ''));

      // SPA fallback: serve index.html for route-like paths without extension
      const relativePath = isRoot || extname(decodedPath) === '' ? 'index.html' : decodedPath;

      // Prevent path traversal; ensure resolved path stays within the renderer base
      const base = resolve(this.rendererFileBasePath);
      const candidate = resolve(base, normalize(relativePath));
      const safePath = candidate.startsWith(base) ? candidate : join(base, 'index.html');

      return net.fetch(pathToFileURL(safePath).toString());
    });
  }
}
