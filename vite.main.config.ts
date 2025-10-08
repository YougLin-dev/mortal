import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

const isDev = process.env.NODE_ENV !== 'production';

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
    sourcemap: isDev,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.trace']
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    },
    lib: {
      entry: 'src/main/main.ts',
      formats: ['es'],
      fileName: () => '[name].js'
    }
  }
});
