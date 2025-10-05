import { getLogger } from '@logtape/logtape';
import { C } from './categories';

export const getIpcRouterLogger = () => getLogger(C.router);
export const getPreloadFetchLogger = (ctx?: Record<string, unknown>) => (ctx ? getLogger(C.fetchPreload).with(ctx) : getLogger(C.fetchPreload));
export const getRendererFetchLogger = (ctx?: Record<string, unknown>) => (ctx ? getLogger(C.fetchRenderer).with(ctx) : getLogger(C.fetchRenderer));

export const getLoggerBy = (...category: string[]) => getLogger(category as unknown as readonly string[]);
