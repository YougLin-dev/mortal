import { stringify, parse } from 'superjson';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toArgument(key: string, data: any) {
  const serializedData = stringify(data);
  return `--${key.toLocaleLowerCase()}=${serializedData}`;
}

export function getArgumentValue<T>(key: string) {
  const arg = process.argv.find((arg) => arg.toLocaleLowerCase().startsWith('--' + key.toLocaleLowerCase() + '='));
  return arg ? parse<T>(arg.split('=')[1]) : null;
}
