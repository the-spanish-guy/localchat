import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import type { ClientToServerEvents, ServerToClientEvents } from "shared";
import { Server } from "socket.io";
import { config } from "./config";
import { connectRedis } from "./services/redisClient";
import { registerSocketHandlers } from "./socket/handlers";

process.on("unhandledRejection", (err) => {
  console.error("[server] unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[server] uncaught exception:", err);
});

async function main() {
  await connectRedis();

  const app = express();
  app.use(cors());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: { origin: "*" },
    },
  );

  registerSocketHandlers(io);

  httpServer.listen(config.port, "0.0.0.0", () => {
    console.log(`[server] rodando em http://0.0.0.0:${config.port}`);
  });
}

main().catch((err) => {
  console.error("[server] falha ao iniciar:", err);
  process.exit(1);
});
