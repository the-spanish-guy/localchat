import cors from "cors";
import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { Server } from "socket.io";
import { config } from "./config";
import { SocketEvents } from "./socket/events";

async function main() {
	const app = express();
	app.use(cors());
	app.get("/health", (_req, res) => res.json({ ok: true }));

	const httpServer = createServer(app);
	const io = new Server(httpServer);

	app.get("/", (req, res) => {
		res.sendFile(join(__dirname, "index.html"));
	});

	io.on("connection", (socket) => {
		socket.on(SocketEvents.UserJoined, (username) => {
			console.log("teste", username);
			io.emit(SocketEvents.UserJoined, username);
		});
	});

	httpServer.listen(config.port, "0.0.0.0", () => {
		console.log(`[server] rodando em http://0.0.0.0:${config.port}`);
	});
}

main().catch((err) => {
	console.error("[server] falha ao iniciar:", err);
	process.exit(1);
});
