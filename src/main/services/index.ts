import { EventEmitterService, eventEmitterService } from './events/broadcaster';
import { StorageService, storageService } from './storage/storage-service';
import { SystemService, systemService } from './system/system-service';
import { TabService, tabService } from './tab/tab-service';
import { ThemeService, themeService } from './ui/theme-service';
import { ShellWindowService, shellWindowService } from './window/shell-window-service';
import { GhostWindowService, ghostWindowService } from './window/ghost-window-service';

export const services = [eventEmitterService, storageService, systemService, themeService, shellWindowService, tabService, ghostWindowService];

export const Services = [EventEmitterService, StorageService, SystemService, ThemeService, ShellWindowService, TabService, GhostWindowService];
