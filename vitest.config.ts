import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Node 22+ ships an experimental localStorage that warns once per worker; jsdom provides ours.
    execArgv: ["--no-experimental-webstorage"],
    setupFiles: "./src/test-setup.ts",
  },
});
