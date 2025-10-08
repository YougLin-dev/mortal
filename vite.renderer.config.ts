import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/renderer/lib'),
      '@/shared': resolve(__dirname, 'src/shared')
    }
  },
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/renderer/content.html'),
        titlebar: resolve(__dirname, 'src/renderer/titlebar.html'),
        loading: resolve(__dirname, 'src/renderer/loading.html')
      }
    },
    outDir: resolve(__dirname, '.vite/build/renderer/main_window'),
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    }
  }
});
