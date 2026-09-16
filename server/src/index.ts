import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { config } from "./config";
import { registerSocketHandlers } from "./socket/handlers";

async function main() {
  const app = express();
  app.use(cors());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  registerSocketHandlers(io);

  httpServer.listen(config.port, "0.0.0.0", () => {
    console.log(`[server] rodando em http://0.0.0.0:${config.port}`);
  });
}

main().catch((err) => {
  console.error("[server] falha ao iniciar:", err);
  process.exit(1);
});
