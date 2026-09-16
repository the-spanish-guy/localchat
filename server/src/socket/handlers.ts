import type { Server, Socket } from "socket.io";
import {
	addConnection,
	getOnlineUsernames,
	removeConnection,
} from "../services/userRegistry";
import { SocketEvents } from "./events";

export function registerSocketHandlers(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on(SocketEvents.UserJoin, (username: string) => {
			console.log(socket.id);
			socket.data.username = username;
			console.log("teste", username);

			const existUser = addConnection(username, socket.id);

			if (existUser) {
				io.emit(SocketEvents.UserJoined, username);
				io.emit(SocketEvents.OnlineUsers, getOnlineUsernames());
			}
		});

		socket.on(SocketEvents.MessageSend, (text: string) => {
			const username = socket.data.username;

			io.emit(SocketEvents.MessageNew, { username, text });
		});

		socket.on("disconnect", (reason) => {
			console.log(reason);
			const username = socket.data.username;
			const socketId = socket.id;
			const shouldBeEmitEvent = removeConnection(username, socketId);

			if (shouldBeEmitEvent) {
				io.emit(SocketEvents.UserLeft, { username });
				io.emit(SocketEvents.OnlineUsers, getOnlineUsernames());
			}
		});
	});
}
