import { STORAGES, type APPStorage } from '@/shared/types/storage-key';
import { isDev } from '@/main/utils/dev';
import { createStorage } from 'electron-async-storage';
import fsDriver from 'electron-async-storage/drivers/fs';
import queueDriver from 'electron-async-storage/drivers/queue';
import { app, nativeTheme } from 'electron';
import { join } from 'path';
import { cwd } from 'process';
import { nanoid } from 'nanoid';
import { detectAppLocale } from '@/shared/utils/locale';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('storage', 'migration');

const devStoragePath = join(cwd(), 'data/storage');
const storagePath = isDev ? devStoragePath : join(app.getPath('userData'), 'storage');

export const storage = createStorage<APPStorage>({
  driver: queueDriver({
    batchSize: 3,
    flushInterval: 1e3,
    maxQueueSize: 1e3,
    mergeUpdates: true,
    driver: fsDriver({
      base: storagePath
    })
  }),
  version: 1,
  migrations: {
    1: async (s) => {
      // init theme state
      const currentThemeState = await s.getItem(STORAGES.APP_THEME_STATE);
      if (currentThemeState == null) {
        await s.setItem(STORAGES.APP_THEME_STATE, {
          theme: 'system',
          shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
          shouldUseHighContrastColors: nativeTheme.shouldUseHighContrastColors,
          shouldUseInvertedColorScheme: nativeTheme.shouldUseInvertedColorScheme
        });
      }

      // init main window state
      const mainWindowState = await s.getItem(STORAGES.APP_WINDOWS('main'));
      if (mainWindowState == null) {
        // @ts-expect-error only init type and tabs
        await s.setItem(STORAGES.APP_WINDOWS('main'), {
          type: 'main',
          windowId: 'main',
          tabs: [
            {
              id: nanoid(),
              isActive: true,
              name: 'Welcome',
              pinned: false,
              url: '/welcome'
            }
          ]
        });
      }

      // init locale state
      const localeState = await s.getItem(STORAGES.APP_I18N_LOCALE);
      if (localeState == null) {
        const appLocale = detectAppLocale('en');
        await s.setItem(STORAGES.APP_I18N_LOCALE, appLocale);
      }
    }
  },
  migrationHooks: {
    afterMigration: (fromVersion, toVersion) => {
      logger.info('Success migration {from}->{to}', { from: fromVersion, to: toVersion });
    },
    onMigrationError(error, fromVersion, toVersion) {
      logger.error('Error migrating {from}->{to}: {error}', { from: fromVersion, to: toVersion, error });
    }
  }
});

storage.mount(
  'app:theme',
  fsDriver({
    base: storagePath
  })
);
