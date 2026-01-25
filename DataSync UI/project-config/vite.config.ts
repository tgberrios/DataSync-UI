import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "../apps/frontend"),
  plugins: [react()],
  server: {
    port: 9876,
    proxy: {
      "/api": {
        target: "http://localhost:8765",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Proxy error:', err);
            }
          });
        },
      },
    },
  },
});
