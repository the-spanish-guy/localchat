import type { ClientToServerEvents, ServerToClientEvents } from "shared";
import { io, type Socket } from "socket.io-client";

// prioridade: argumento de linha de comando > variável de ambiente > localhost
export const SERVER_URL =
	process.argv[2] ?? process.env.LOCALCHAT_SERVER_URL ?? "http://localhost:3000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
	io(SERVER_URL);
