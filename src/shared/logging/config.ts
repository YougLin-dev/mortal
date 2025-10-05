import { configureSync, getConsoleSink } from '@logtape/logtape';
import { getPrettyFormatter } from '@logtape/pretty';
import { jsonLinesFormatter } from '@logtape/logtape';

export type ProcessEnv = 'main' | 'preload' | 'renderer';

const prettyFormatter = getPrettyFormatter({
  wordWrap: false,
  inspectOptions: {
    depth: Infinity,
    compact: false
  }
});

export function initLogging(env: ProcessEnv, level?: 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal') {
  const isProd =
    env === 'renderer' ? (typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : false) : process.env.NODE_ENV === 'production';
  const lowestLevel = level ?? (isProd ? 'info' : 'debug');

  configureSync({
    sinks: {
      console: getConsoleSink({
        formatter: isProd ? jsonLinesFormatter : prettyFormatter
      })
    },
    loggers: [{ category: [], lowestLevel, sinks: ['console'] }]
  });
}
