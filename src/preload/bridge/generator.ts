/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error - Virtual module provided by Vite plugin
import metadata from 'virtual:service-metadata';

import { ipcRenderer } from 'electron';
import mitt, { type Emitter } from 'mitt';
import type { CollectedMetadata } from '@/vite-plugins/metadata';
import { GLOBAL_EVENTS } from '@/shared/types/event';
import { camelCase } from 'es-toolkit';
import { ipcEventRouter } from '@/preload/ipc/router';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('preload', 'bridge');

export const globalEmitter: Emitter<any> = mitt();
export function setupEventForwarding() {
  Object.values(GLOBAL_EVENTS).forEach((channel) => {
    ipcEventRouter.on(channel, (_event, realChannel, data) => {
      globalEmitter.emit(realChannel, data);
    });
  });
}

export function initPreloadBridge(): Record<string, any> {
  const bridge: Record<string, any> = {};

  try {
    const serviceMetadata = metadata as CollectedMetadata;

    if (!serviceMetadata?.services) {
      logger.error('Invalid service metadata format');
      return bridge;
    }

    for (const service of serviceMetadata.services) {
      const serviceName = camelCase(service.serviceName);
      const serviceObj: Record<string, any> = {};

      if (!service.handlers || !serviceName || service.handlers.length === 0) {
        continue;
      }

      for (const handler of service.handlers) {
        const ipcChannel = `${serviceName}:${handler}`;
        serviceObj[handler] = (...args: any[]) => {
          return ipcRenderer.invoke(ipcChannel, ...args);
        };
      }

      bridge[serviceName] = serviceObj;
    }
  } catch (error) {
    logger.error('Failed to load service metadata: {error}', { error });
  }

  return bridge;
}
