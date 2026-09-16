import { randomUUID } from "node:crypto";
import type {
	ClientToServerEvents,
	ServerToClientEvents,
} from "shared";
import { SocketEvents } from "shared";
import type { Server, Socket } from "socket.io";
import { getMessageHistory, saveMessage } from "../services/redisClient";
import {
	addConnection,
	getOnlineUsernames,
	removeConnection,
} from "../services/userRegistry";

export function registerSocketHandlers(
	io: Server<ClientToServerEvents, ServerToClientEvents>,
) {
	io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
		socket.on(SocketEvents.UserJoin, async (username: string) => {
			socket.data.username = username;

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

		socket.on(SocketEvents.MessageSend, async (text: string) => {
			const username = socket.data.username;

			try {
				await saveMessage({
					createdAt: Date.now(),
					id: randomUUID(),
					text,
					username,
				});
			} catch (err) {
				console.error("[redis] falha ao salvar mensagem:", err);
			}

			io.emit(SocketEvents.MessageNew, { username, text });
		});

		socket.on("disconnect", () => {
			const username = socket.data.username;
			const socketId = socket.id;
			const shouldBeEmitEvent = removeConnection(username, socketId);

			if (shouldBeEmitEvent) {
				io.emit(SocketEvents.UserLeft, username);
				io.emit(SocketEvents.OnlineUsers, getOnlineUsernames());
			}
		});
	});
}
