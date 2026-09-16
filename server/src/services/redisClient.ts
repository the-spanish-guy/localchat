import { createClient } from "redis";
import { config } from "../config";
import type { ChatMessage } from "../types";

const MESSAGES_KEY = "chat:message";

export const redisClient = createClient({ url: config.redisUrl });

redisClient.on("error", (err) => {
	console.error("[redis] connection error:", err);
});

export async function connectRedis() {
	await redisClient.connect();
}

export async function saveMessage(message: ChatMessage) {
	await redisClient.RPUSH(MESSAGES_KEY, JSON.stringify(message));
	await redisClient.LTRIM(MESSAGES_KEY, -config.messageHistoryLimit, -1);
	await redisClient.expire(MESSAGES_KEY, config.messageTtlSeconds);
}
export async function getMessageHistory(): Promise<ChatMessage[]> {
	const messages = await redisClient.LRANGE(MESSAGES_KEY, 0, -1);

	return messages.map((message) => JSON.parse(message) as ChatMessage);
}
