import "dotenv/config";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import cors from "cors";
import express from "express";
import type { ClientToServerEvents, ServerToClientEvents } from "shared";
import { Server } from "socket.io";
import { config } from "./config";
import { connectRedis } from "./services/redisClient";
import { registerSocketHandlers } from "./socket/handlers";

async function main() {
  await connectRedis();

  const app = express();
  app.use(cors());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // em produção (ex: Docker), o client já vem "buildado" (vite build) e
  // fica ao lado do server no mesmo diretório de origem — se existir,
  // serve como estático. Em dev normal, essa pasta não existe (o Vite
  // dev server cuida disso separadamente) e essa linha não faz nada.
  const clientDistPath = join(__dirname, "../../client/dist");
  if (existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
  }

  const httpServer = createServer(app);
  // sem cors: o client agora conecta sempre na mesma origem (via proxy
  // do Vite em dev, ou porque o server serve o build do client em prod)
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

  registerSocketHandlers(io);

  httpServer.listen(config.port, "0.0.0.0", () => {
    console.log(`[server] rodando em http://0.0.0.0:${config.port}`);
  });
}

main().catch((err) => {
  console.error("[server] falha ao iniciar:", err);
  process.exit(1);
});
