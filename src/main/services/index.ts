import { EventEmitterService, eventEmitterService } from './event-emitter';
import { MathService, mathService } from './math-service';
import { StorageService, storageService } from './storage-service';
import { SystemService, systemService } from './system-service';
import { ThemeService, themeService } from './theme-service';
import { WindowService, windowService } from './window-service';

export const services = [mathService, eventEmitterService, storageService, systemService, themeService, windowService];

export const Services = [MathService, EventEmitterService, StorageService, SystemService, ThemeService, WindowService];
