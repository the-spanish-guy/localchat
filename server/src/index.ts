import cors from "cors";
import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { config } from "./config";

async function main() {
	const app = express();
	app.use(cors());
	app.get("/health", (_req, res) => res.json({ ok: true }));

	const httpServer = createServer(app);

	httpServer.listen(config.port, "0.0.0.0", () => {
		console.log(`[server] rodando em http://0.0.0.0:${config.port}`);
	});
}

main().catch((err) => {
	console.error("[server] falha ao iniciar:", err);
	process.exit(1);
});
