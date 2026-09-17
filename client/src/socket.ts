import type { ClientToServerEvents, ServerToClientEvents } from "shared";
import { io, type Socket } from "socket.io-client";

// sem URL: conecta na mesma origem que serviu a página. Em dev, o Vite
// faz proxy de /socket.io pro server (ver vite.config.ts); em produção,
// o próprio server serve o build do client, então já é a mesma origem.
//
// client escuta o que o server emite (ServerToClientEvents) e emite o
// que o server escuta (ClientToServerEvents) ordem invertida em relação
// ao Server<ClientToServerEvents, ServerToClientEvents> do lado do server
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
