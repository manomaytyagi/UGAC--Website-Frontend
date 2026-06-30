const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");

module.exports = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

export default {
  server: {
    proxy: {
      "/api-proxy": {
        target: "https://ug-0ceb454fbac544039d40462fe569d71b.ecs.ap-south-1.on.aws/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ""),
      },
    },
  },
};