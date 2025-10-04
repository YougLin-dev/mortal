import { mount } from 'svelte';
import './app.css';
import App from './app.svelte';
import { initI18n } from '$lib/i18n/init';
import { ipcFetch as wrappedIpcFetch } from '$lib/fetch';

initI18n();

window.ipcFetch = wrappedIpcFetch;

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
