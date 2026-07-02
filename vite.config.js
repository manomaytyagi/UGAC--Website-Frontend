import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget =
    env.VITE_API_BASE || "https://ug-0ceb454fbac544039d40462fe569d71b.ecs.ap-south-1.on.aws/";

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