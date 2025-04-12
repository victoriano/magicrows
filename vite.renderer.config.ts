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
    // Change output directory to match where Electron expects files
    outDir: path.join(__dirname, '.vite/renderer'),
    emptyOutDir: true,
    sourcemap: true,
    // Ensure the correct asset naming and paths for Electron
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
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
  // Absolute base path for assets to ensure they're found in packaged app
  base: './',
  // Define global constants
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  // Explicitly set entry point
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-redux', 'redux'],
  },
  // Set root directory properly
  root: path.join(__dirname, 'src/renderer'),
  publicDir: 'assets',
});