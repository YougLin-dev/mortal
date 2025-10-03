import { mount } from 'svelte';
import './app.css';
import App from './app.svelte';
import { initI18n } from '$lib/i18n/init';

initI18n();

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
