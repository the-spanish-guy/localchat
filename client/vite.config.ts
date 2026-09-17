import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true, // expõe na rede local
    port: 5173,
  },
});
