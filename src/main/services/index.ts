import { EventEmitterService, eventEmitterService } from './events/broadcaster';
import { StorageService, storageService } from './storage/storage-service';
import { SystemService, systemService } from './system/system-service';
import { ThemeService, themeService } from './ui/theme-service';
import { WindowService, windowService } from './window/window-service';

export const services = [eventEmitterService, storageService, systemService, themeService, windowService];

export const Services = [EventEmitterService, StorageService, SystemService, ThemeService, WindowService];
