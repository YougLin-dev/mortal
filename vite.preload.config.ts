import { defineConfig } from 'vite';
import { resolve } from 'path';
import { metadataInlinePlugin } from './vite-plugins';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    metadataInlinePlugin({
      servicesDir: 'src/main/services',
      debug: process.env.NODE_ENV === 'development',
      cacheTTL: 3000, // 3 seconds for faster development
      watchPatterns: ['**/*.ts', '**/*.js'],
      tsconfigPath: 'tsconfig.node.json'
    })
  ],
  resolve: {
    alias: {
      '@/shared': resolve(__dirname, 'src/shared/')
    }
  }
});
