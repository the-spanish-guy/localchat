const userLists: Map<string, Set<string>> = new Map();

export function addConnection(username: string, socketId: string) {
	const existingConnections = userLists.get(username);

	if (!existingConnections) {
		userLists.set(username, new Set([socketId]));
		return true;
	}

	existingConnections.add(socketId);
	return false;
}
export function removeConnection(username: string, socketId: string) {
	const activeConnections = userLists.get(username);

	activeConnections?.delete(socketId);

	const wentFullyOffline = !activeConnections?.size;
	if (wentFullyOffline) userLists.delete(username);
	return wentFullyOffline;
}
export function getOnlineUsernames() {
	return Array.from(userLists.keys());
}

export function getConnections(username: string): string[] {
	const connections = userLists.get(username);
	return connections ? Array.from(connections) : [];
}
