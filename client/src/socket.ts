import { io, type Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? `http://${window.location.hostname}:3000`;

export const socket: Socket = io(SERVER_URL);
