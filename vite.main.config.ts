import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(resolve(__dirname, 'resources/')),
          dest: normalizePath(resolve(__dirname, '.vite/build/'))
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@/main': resolve(__dirname, 'src/main/'),
      '@/shared': resolve(__dirname, 'src/shared/')
    }
  },
  build: {
    lib: {
      entry: 'src/main/main.ts',
      formats: ['es'],
      fileName: () => '[name].js'
    }
  }
});
