export const SocketEvents = {
  UserJoin: "user:join",
  UserJoined: "user:joined",
  UserLeft: "user:left",
  MessageSend: "message:send",
  MessageNew: "message:new",
  MessageHistory: "message:history",
  OnlineUsers: "users:online",
  TypingStart: "typing:start",
  TypingStop: "typing:stop",
  UserTyping: "user:typing",
  Nudge: "nudge",
  NudgeReceived: "nudge:received",
} as const;
