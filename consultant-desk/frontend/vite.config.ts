import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // IPv4 explícito — em Windows o Vite às vezes sobe só em ::1 e o proxy/API falha.
    host: "127.0.0.1",
    strictPort: true,
    proxy: {
      "/api-desk": {
        target: "http://127.0.0.1:4010",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-desk/, ""),
        // Encaminha Set-Cookie / Cookie para sessão httpOnly no mesmo host do Vite.
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const raw = proxyRes.headers["set-cookie"];
            if (!raw) return;
            const list = Array.isArray(raw) ? raw : [raw];
            proxyRes.headers["set-cookie"] = list.map((c) =>
              c
                .replace(/;\s*Domain=[^;]+/i, "")
                .replace(/;\s*Secure/gi, ""),
            );
          });
        },
      },
    },
  },
});
