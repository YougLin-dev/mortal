import { getHandlers, getServiceName } from '@/shared/decorators';
import { services } from '@/main/services';
import { ipcMain } from 'electron';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('ipc', 'handlers', 'setup');

export function setupIPC() {
  services.forEach((service) => {
    const Service = service.constructor;
    const handlers = getHandlers(Service);
    const serviceName = getServiceName(Service);

    if (!handlers || !serviceName) {
      return;
    }

    for (const [methodName, method] of Object.entries(handlers)) {
      const ipcChannel = `${serviceName}:${methodName}`;
      ipcMain.handle(ipcChannel, method.bind(service));
      logger.info('[{serviceName}] Registered handler {channel}', { serviceName, channel: ipcChannel });
    }
  });
}
