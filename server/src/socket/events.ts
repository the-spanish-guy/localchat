export const SocketEvents = {
	UserJoin: "user:join",
	UserJoined: "user:joined",
	UserLeft: "user:left",
	MessageSend: "message:send",
	MessageNew: "message:new",
	MessageHistory: "message:history",
	OnlineUsers: "users:online",
} as const;
