import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '.vite/build',
    emptyOutDir: false,
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true, // Force the specified port
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
    middlewareMode: false,
  },
  // Public base path for assets
  base: './',
  // Define global constants
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  // Explicitly set entry point
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-redux', 'redux'],
  },
  experimental: {
    renderBuiltUrl(filename) {
      return filename;
    },
  },
  // Set root directory properly
  root: path.join(__dirname, 'src/renderer'),
  publicDir: 'assets',
});