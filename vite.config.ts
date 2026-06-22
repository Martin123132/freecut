import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webPort = Number(process.env.FREECUT_WEB_PORT || 5173);
const apiPort = Number(process.env.PORT || 5174);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: false,
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`
    }
  }
});
