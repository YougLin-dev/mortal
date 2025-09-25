import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import picomatch from 'picomatch';

import type { ServiceMetadata, CollectedMetadata } from './types';

export interface MetadataCollectorOptions {
  servicesDir: string;
  serviceDecoratorName: string;
  handlerDecoratorName: string;
  tsconfigPath: string;
  watchPatterns: string[];
}

export class MetadataCollector {
  private program: ts.Program;
  private options: MetadataCollectorOptions;

  constructor(options: Partial<MetadataCollectorOptions> = {}) {
    this.options = {
      servicesDir: 'src/main/services',
      serviceDecoratorName: 'Service',
      handlerDecoratorName: 'Handler',
      tsconfigPath: 'tsconfig.json',
      watchPatterns: ['**/*.ts'],
      ...options
    };

    // Create TypeScript program
    const configPath = ts.findConfigFile('./', ts.sys.fileExists, this.options.tsconfigPath);
    if (!configPath) {
      throw new Error(`Could not find a valid ${this.options.tsconfigPath}.`);
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');

    this.program = ts.createProgram(compilerOptions.fileNames, compilerOptions.options);
  }

  collect(): CollectedMetadata {
    const services: ServiceMetadata[] = [];

    // Get all TypeScript files in services directory
    const serviceFiles = this.getServiceFiles();

    for (const filePath of serviceFiles) {
      const sourceFile = this.program.getSourceFile(filePath);
      if (!sourceFile) continue;

      const fileServices = this.extractServicesFromFile(sourceFile);
      services.push(...fileServices);
    }

    return {
      services,
      generatedAt: new Date().toISOString()
    };
  }

  private getServiceFiles(): string[] {
    const files: string[] = [];
    const resolvedServicesDir = path.resolve(this.options.servicesDir);

    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const relativePath = path.relative(resolvedServicesDir, fullPath);
          const matchesPattern = this.options.watchPatterns.some((pattern) => {
            const isMatch = picomatch(pattern, { dot: true });
            return isMatch(relativePath);
          });

          if (matchesPattern) {
            files.push(path.resolve(fullPath));
          }
        }
      }
    };

    if (fs.existsSync(resolvedServicesDir)) {
      walkDir(resolvedServicesDir);
    }

    return files;
  }

  private extractServicesFromFile(sourceFile: ts.SourceFile): ServiceMetadata[] {
    const services: ServiceMetadata[] = [];

    const visitNode = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const serviceMetadata = this.extractServiceMetadata(node);
        if (serviceMetadata) {
          services.push(serviceMetadata);
        }
      }
      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return services;
  }

  private extractServiceMetadata(classNode: ts.ClassDeclaration): ServiceMetadata | null {
    // Find @Service decorator

    // Extract handlers from class methods
    const handlers = this.extractHandlers(classNode);

    return {
      serviceName: classNode.name?.text || '',
      handlers
    };
  }

  private getDecoratorName(decorator: ts.Decorator): string | null {
    if (ts.isCallExpression(decorator.expression)) {
      if (ts.isIdentifier(decorator.expression.expression)) {
        return decorator.expression.expression.text;
      }
    } else if (ts.isIdentifier(decorator.expression)) {
      return decorator.expression.text;
    }
    return null;
  }

  private extractHandlers(classNode: ts.ClassDeclaration): string[] {
    const handlers: string[] = [];

    if (!classNode.members) return handlers;

    for (const member of classNode.members) {
      if (ts.isMethodDeclaration(member)) {
        const handler = this.extractHandlerMetadata(member);
        if (handler) {
          handlers.push(handler);
        }
      }
    }

    return handlers;
  }

  private extractHandlerMetadata(method: ts.MethodDeclaration): string | null {
    if (!method.modifiers) return null;

    for (const modifier of method.modifiers) {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (decoratorName === this.options.handlerDecoratorName) {
          if (ts.isIdentifier(method.name)) {
            return method.name.text;
          }
        }
      }
    }

    return null;
  }
}
