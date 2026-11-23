import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const contractsTransport = fileURLToPath(
  new URL("../../packages/contracts/src/transport.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@kgpay/contracts/transport": contractsTransport },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    env: { VITE_AUTH_API_URL: "http://localhost:3000" },
  },
});
