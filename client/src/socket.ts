import type { ClientToServerEvents, ServerToClientEvents } from "shared";
import { io, type Socket } from "socket.io-client";

const SERVER_URL =
	import.meta.env.VITE_SERVER_URL ?? `http://${window.location.hostname}:3000`;

// client escuta o que o server emite (ServerToClientEvents) e emite o
// que o server escuta (ClientToServerEvents) ordem invertida em relação
// ao Server<ClientToServerEvents, ServerToClientEvents> do lado do server
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
	io(SERVER_URL);
