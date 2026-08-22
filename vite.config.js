import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const backendTarget = "https://ugac-api.onrender.com/";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      proxy: {
        "/api-proxy": {
          target: backendTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-proxy/, ""),
        },
      },
    },
  };
});
