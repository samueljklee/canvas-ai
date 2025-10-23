import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron file:// protocol
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't wipe dist/ - main process files are already there
    sourcemap: true
  }
});
