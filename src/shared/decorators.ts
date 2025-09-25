/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { camelCase } from 'es-toolkit';

// @ts-expect-error ployfill
Symbol.metadata ??= Symbol('Symbol.metadata');
export const HANDLERS = Symbol('HANDLERS');
export const SERVICE_NAME = Symbol('SERVICE_NAME');

export function Handler(originalMethod: Function, context: ClassMethodDecoratorContext) {
  const metadata = context.metadata as any;
  metadata[HANDLERS] ??= {};
  metadata[HANDLERS][context.name] = originalMethod;

  return function (this: any, ...args: any[]) {
    return originalMethod.apply(this, args);
  };
}

export function Service<T extends new (...args: any[]) => any>(constructor: T, context: ClassDecoratorContext<T>): T {
  const metadata = context.metadata as any;
  metadata[SERVICE_NAME] = camelCase(constructor.name);
  return constructor;
}

export function getHandlers<T extends Function>(T: T): Record<string, Function> | undefined {
  const metadata = T[Symbol.metadata] as any;
  if (!metadata) {
    return undefined;
  }
  return metadata[HANDLERS];
}

export function getServiceName<T extends Function>(T: T): string | undefined {
  const metadata = T[Symbol.metadata] as any;
  if (!metadata) {
    return undefined;
  }
  return metadata[SERVICE_NAME];
}
