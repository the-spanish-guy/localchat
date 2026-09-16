import type { Server, Socket } from "socket.io";
import { getMessageHistory, saveMessage } from "../services/redisClient";
import {
	addConnection,
	getOnlineUsernames,
	removeConnection,
} from "../services/userRegistry";
import { SocketEvents } from "./events";

export function registerSocketHandlers(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on(SocketEvents.UserJoin, async (username: string) => {
			console.log(socket.id);
			socket.data.username = username;
			console.log("teste", username);

			const existUser = addConnection(username, socket.id);

			if (existUser) {
				io.emit(SocketEvents.UserJoined, username);
				io.emit(SocketEvents.OnlineUsers, getOnlineUsernames());
			} else {
				/**
				 * usuário já estava online em outra aba/aparelho, então a lista não
				 * muda, apenas para quem acabou de entrar. Assim emitimos só
				 * pro socket novo, não pra todo mundo(io.emit)
				 */
				socket.emit(SocketEvents.OnlineUsers, getOnlineUsernames());
			}

			const messagesHistory = await getMessageHistory();
			socket.emit(SocketEvents.MessageHistory, messagesHistory);
		});

		socket.on(SocketEvents.MessageSend, (text: string) => {
			const username = socket.data.username;

			saveMessage({ createdAt: Date.now(), id: socket.id, text, username });
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
