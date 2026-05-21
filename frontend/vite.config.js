import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'node:http';

// Dedicated agent with keep-alive disabled.
// Fixes the intermittent "ECONNRESET" / "Failed to book" issue where the
// dev proxy reused a connection that the backend had silently closed.
const proxyAgent = new http.Agent({ keepAlive: false });

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        agent: proxyAgent,
      },
    },
  },
});
