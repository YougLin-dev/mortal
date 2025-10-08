import { mount } from 'svelte';
import './app.css';
import TitlebarApp from './titlebar-app.svelte';
import { initI18n } from '$lib/i18n/init';
import { ipcFetch as wrappedIpcFetch } from '$lib/fetch';
import { initLogging } from '@/shared/logging/config';

initLogging('renderer');
initI18n();

window.ipcFetch = wrappedIpcFetch;

const app = mount(TitlebarApp, {
  target: document.getElementById('titlebar')!
});

export default app;
