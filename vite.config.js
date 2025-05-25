// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Or your preferred port
    open: true // Automatically open in browser
  },
  build: {
    outDir: 'build' // Or your preferred output directory
  }
});