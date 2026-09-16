import { SocketEvents } from "./events";
import type { ChatMessage } from "./types";

export interface ClientToServerEvents {
  [SocketEvents.UserJoin]: (username: string) => void;
  [SocketEvents.MessageSend]: (text: string) => void;
  [SocketEvents.TypingStart]: () => void;
  [SocketEvents.TypingStop]: () => void;
}

export interface ServerToClientEvents {
  [SocketEvents.UserJoined]: (username: string) => void;
  [SocketEvents.UserLeft]: (username: string) => void;
  [SocketEvents.MessageNew]: (payload: { username: string; text: string }) => void;
  [SocketEvents.MessageHistory]: (messages: ChatMessage[]) => void;
  [SocketEvents.OnlineUsers]: (usernames: string[]) => void;
  [SocketEvents.UserTyping]: (payload: { username: string; isTyping: boolean }) => void;
}
