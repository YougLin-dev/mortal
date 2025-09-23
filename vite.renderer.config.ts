import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [svelte()],
  build: {
    outDir: resolve(__dirname, '.vite/build/renderer/main_window')
  }
});
