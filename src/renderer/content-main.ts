import { mount } from 'svelte';
import './app.css';
import App from './content-app.svelte';
import { initI18n } from '$lib/i18n/init';
import { ipcFetch as wrappedIpcFetch } from '$lib/fetch';
import { initLogging } from '@/shared/logging/config';
import { themeStore } from '$lib/stores';

initLogging('renderer');
initI18n();

window.ipcFetch = wrappedIpcFetch;

void themeStore;

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
