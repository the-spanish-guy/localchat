import { createClient } from "redis";
import type { ChatMessage } from "shared";
import { config } from "../config";

const MESSAGES_KEY = "chat:message";

export const redisClient = createClient({ url: config.redisUrl });

redisClient.on("error", (err) => {
	console.error("[redis] connection error:", err);
});

export async function connectRedis() {
	await redisClient.connect();
}

export async function saveMessage(message: ChatMessage) {
	await redisClient.ZADD(MESSAGES_KEY, {
		score: message.createdAt,
		value: JSON.stringify(message),
	});
	await pruneExpiredMessages();
	await redisClient.ZREMRANGEBYRANK(MESSAGES_KEY, 0, -config.messageHistoryLimit - 1);
	await redisClient.expire(MESSAGES_KEY, config.messageTtlSeconds);
}
export async function getMessageHistory(): Promise<ChatMessage[]> {
	await pruneExpiredMessages();
	const messages = await redisClient.ZRANGE(MESSAGES_KEY, 0, -1);

	return messages.map((message) => JSON.parse(message) as ChatMessage);
}

function pruneExpiredMessages() {
	const cutoff = Date.now() - config.messageTtlSeconds * 1000;

	return redisClient.ZREMRANGEBYSCORE(MESSAGES_KEY, "-inf", cutoff);
}
