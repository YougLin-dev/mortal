import { contextBridge } from 'electron';

import { initPreloadBridge, globalEmitter, setupEventForwarding } from './bridge/generator';
import { ipcFetch, createStreamController, abortIpcRequest } from './fetch/bridge';
import { electronAPI } from '@electron-toolkit/preload';
import { getArgumentValue } from '@/shared/utils/preload-utils';
import type { WindowState } from '@/shared/types/window';
import { initLogging } from '@/shared/logging/config';
import { getLoggerBy } from '@/shared/logging/helpers';

initLogging('preload');

const logger = getLoggerBy('preload', 'bridge');

const windowState = getArgumentValue<WindowState>('windowState');
const isMac = getArgumentValue<boolean>('isMac');
const locale = getArgumentValue<string>('locale');

setupEventForwarding();

const bridge = initPreloadBridge();

logger.debug('Generated bridge', { keys: Object.keys(bridge) });

for (const [serviceName, serviceObj] of Object.entries(bridge)) {
  logger.debug('Exposing service {serviceName} with {methods}', { serviceName, methods: Object.keys(serviceObj) });
  contextBridge.exposeInMainWorld(serviceName, serviceObj);
}

contextBridge.exposeInMainWorld('_ipcFetchRaw', ipcFetch);
contextBridge.exposeInMainWorld('_createStreamController', createStreamController);
contextBridge.exposeInMainWorld('_abortIpcRequest', abortIpcRequest);
contextBridge.exposeInMainWorld('events', globalEmitter);
contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('windowState', windowState);
contextBridge.exposeInMainWorld('isMac', isMac);
contextBridge.exposeInMainWorld('locale', locale);
