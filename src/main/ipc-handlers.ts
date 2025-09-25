import { getHandlers, getServiceName } from '@/shared/decorators';
import { services } from './services';
import { ipcMain } from 'electron';

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
      console.log(`Registered handler: ${ipcChannel}`);
    }
  });
}
