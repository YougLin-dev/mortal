import { net, protocol } from 'electron';
import { join } from 'path';

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
      let filePath = join(this.rendererFileBasePath, url.pathname);
      if (url.pathname === '/') {
        filePath = join(this.rendererFileBasePath, 'index.html');
      }
      return net.fetch(`file://${filePath}`);
    });
  }
}
