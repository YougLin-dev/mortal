/* eslint-disable @typescript-eslint/no-explicit-any */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TITLEBAR_CONTROLS_WIDTH } from '@/shared/consts/ui';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export const isDev = process.env.NODE_ENV === 'development';

const platform = window.platform;
export const isMac = platform === 'darwin';
export const isWindows = platform === 'win32';
export const isLinux = platform === 'linux';

export function setupTitlebarOffset(): void {
  const titlebarOffset = isLinux ? TITLEBAR_CONTROLS_WIDTH.LINUX : TITLEBAR_CONTROLS_WIDTH.WINDOWS;
  document.documentElement.style.setProperty('--titlebar-offset', `${titlebarOffset}px`);
  document.documentElement.style.setProperty('--titlebar-offset-default', `${TITLEBAR_CONTROLS_WIDTH.WINDOWS}px`);
}
