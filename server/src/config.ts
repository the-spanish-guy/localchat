export const config = {
	port: Number(process.env.PORT) || 3000,
	redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
	messageTtlSeconds: Number(process.env.MESSAGE_TTL_SECONDS) || 60 * 60 * 24,
	messageHistoryLimit: Number(process.env.MESSAGE_HISTORY_LIMIT) || 200,
	mdnsHost: process.env.MDNS_HOST || "chat.local",
};
