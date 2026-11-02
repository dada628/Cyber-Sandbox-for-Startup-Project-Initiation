import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { selectMode } from "./src/model/mode.ts";

const modelMode = (): Plugin => {
  return {
    name: "model-mode",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "GET" || path !== "/api/model-mode") {
          next();
          return;
        }
        const env = loadEnv(server.config.mode, process.cwd(), "");
        const mode = selectMode(env);
        console.log(`model-mode ${mode}`);
        const body = JSON.stringify({ mode });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(body);
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), modelMode()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
});
