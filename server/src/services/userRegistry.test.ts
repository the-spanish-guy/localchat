import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	addConnection,
	getConnections,
	getOnlineUsernames,
	removeConnection,
} from "./userRegistry";

function uniqueUsername() {
	return `user-${randomUUID()}`;
}

describe("userRegistry", () => {
	it("marca a primeira conexão de um username como nova", () => {
		const username = uniqueUsername();

		expect(addConnection(username, "socket-1")).toBe(true);
	});

	it("não marca conexões seguintes do mesmo username como novas", () => {
		const username = uniqueUsername();

		addConnection(username, "socket-1");

		expect(addConnection(username, "socket-2")).toBe(false);
	});

	it("lista o username como online depois de conectar", () => {
		const username = uniqueUsername();

		addConnection(username, "socket-1");

		expect(getOnlineUsernames()).toContain(username);
	});

	it("retorna os socketIds ativos de um username", () => {
		const username = uniqueUsername();

		addConnection(username, "socket-1");
		addConnection(username, "socket-2");

		expect(getConnections(username).sort()).toEqual(["socket-1", "socket-2"]);
	});

	it("retorna array vazio pra username sem nenhuma conexão", () => {
		expect(getConnections(uniqueUsername())).toEqual([]);
	});

	it("não marca como offline enquanto sobrar outra conexão do mesmo username", () => {
		const username = uniqueUsername();

		addConnection(username, "socket-1");
		addConnection(username, "socket-2");

		expect(removeConnection(username, "socket-1")).toBe(false);
		expect(getOnlineUsernames()).toContain(username);
	});

	it("marca como offline quando a última conexão sai", () => {
		const username = uniqueUsername();

		addConnection(username, "socket-1");

		expect(removeConnection(username, "socket-1")).toBe(true);
		expect(getOnlineUsernames()).not.toContain(username);
	});

	it("remover uma conexão que não existe não quebra nada", () => {
		const username = uniqueUsername();

		expect(removeConnection(username, "socket-fantasma")).toBe(true);
	});
});
