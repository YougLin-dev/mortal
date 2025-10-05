import { getHandlers, getServiceName } from '@/shared/decorators';
import { services } from '@/main/services';
import { ipcMain } from 'electron';
import { getLoggerBy } from '@/shared/logging/helpers';

export function setupIPC() {
  services.forEach((service) => {
    const Service = service.constructor;
    const handlers = getHandlers(Service);
    const serviceName = getServiceName(Service);

    if (!handlers || !serviceName) {
      return;
    }

    const logger = getLoggerBy('ipc', 'handlers', 'setup', serviceName);
    for (const [methodName, method] of Object.entries(handlers)) {
      const ipcChannel = `${serviceName}:${methodName}`;
      ipcMain.handle(ipcChannel, method.bind(service));
      logger.info('Registered handler {channel}', { channel: ipcChannel });
    }
  });
}
