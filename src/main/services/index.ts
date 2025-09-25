import { EventEmitterService, eventEmitterService } from './event-emitter';
import { MathService, mathService } from './math-service';
import { StorageService, storageService } from './storage-service';
import { SystemService, systemService } from './system-service';
import { ThemeService, themeService } from './theme-service';

export const services = [mathService, eventEmitterService, storageService, systemService, themeService];

export const Services = [MathService, EventEmitterService, StorageService, SystemService, ThemeService];
