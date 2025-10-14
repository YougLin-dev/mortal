import WelcomePage from './pages/welcome-page.svelte';
import ChatPage from './pages/chat-page.svelte';
import SettingsLayout from './pages/settings/settings-layout.svelte';
import GeneralSettings from './pages/settings/general-settings.svelte';
import ProviderSettings from './pages/settings/provider-settings.svelte';
import AboutSettings from './pages/settings/about-settings.svelte';
import type { RouteRecord } from '$lib/router/types';

// path starts with / is absolute path
// path not starts with / is relative path
// if the route has children, the path must not start with /
export const routes: RouteRecord[] = [
  { name: 'root', path: '/', redirect: { name: 'welcome' } },
  { name: 'welcome', path: '/welcome', component: WelcomePage },
  { name: 'chat', path: '/chat/:id?', component: ChatPage },
  {
    name: 'settings',
    path: '/settings',
    component: SettingsLayout,
    children: [
      { path: '', redirect: { name: 'settings-general' } },
      { name: 'settings-general', path: 'general', component: GeneralSettings },
      { name: 'settings-providers', path: 'providers', component: ProviderSettings },
      { name: 'settings-about', path: 'about', component: AboutSettings }
    ]
  }
];
