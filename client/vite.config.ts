import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true, // expõe na rede local
    port: 5173,
    allowedHosts: ["chat.local"], // libera o nome anunciado via mDNS
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true, // faz o proxy do upgrade pra WebSocket também
      },
    },
  },
});
