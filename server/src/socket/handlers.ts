import type { Server, Socket } from "socket.io";
import { SocketEvents } from "./events";

export function registerSocketHandlers(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on(SocketEvents.UserJoin, (username: string) => {
			socket.data.username = username;
			console.log("teste", username);
			io.emit(SocketEvents.UserJoined, username);
		});

		socket.on(SocketEvents.MessageSend, (text: string) => {
			const username = socket.data.username;

			io.emit(SocketEvents.MessageNew, { username, text });
		});

		socket.on("disconnect", (reason) => {
			console.log(reason);
			const username = socket.data.username;

			io.emit(SocketEvents.UserLeft, { username });
		});
	});
}
