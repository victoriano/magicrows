import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    outDir: '.vite/main',
    lib: {
      entry: 'src/main/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'crypto',
        'fs',
        'fs/promises',
        'path',
        'os',
        'electron',
        'electron-store',
        /^node:/,
        ...Object.keys(require('./package.json').dependencies || {}),
      ],
      output: {
        format: 'cjs', // Use CommonJS format for main process
      },
    },
    emptyOutDir: true,
    sourcemap: true,
  },
});