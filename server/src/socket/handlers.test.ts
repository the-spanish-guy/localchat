import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { type Socket as ClientSocket, io as ioc } from "socket.io-client";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { registerSocketHandlers } from "./handlers";

vi.mock("../services/redisClient", () => ({
	saveMessage: vi.fn().mockResolvedValue(undefined),
	getMessageHistory: vi.fn().mockResolvedValue([]),
}));

function waitFor<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
	return new Promise((resolve) => socket.once(event, resolve));
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("socket handlers", () => {
	let httpServer: ReturnType<typeof createServer>;
	let io: Server;
	let port: number;
	let clients: ClientSocket[] = [];

	beforeAll(async () => {
		httpServer = createServer();
		io = new Server(httpServer);
		registerSocketHandlers(io);
		await new Promise<void>((resolve) => {
			httpServer.listen(0, resolve);
		});
		port = (httpServer.address() as AddressInfo).port;
	});

	afterAll(() => {
		io.close();
		httpServer.close();
	});

	afterEach(() => {
		for (const client of clients) client.close();
		clients = [];
	});

	function connect(): ClientSocket {
		const socket = ioc(`http://localhost:${port}`);
		clients.push(socket);
		return socket;
	}

	it("emite user:joined pra todo mundo na primeira conexão de um username", async () => {
		const a = connect();
		await waitFor(a, "connect");

		const joinedPromise = waitFor<string>(a, "user:joined");
		a.emit("user:join", "Pancha");

		expect(await joinedPromise).toBe("Pancha");
	});

	it("não repete user:joined quando o mesmo username entra numa segunda aba", async () => {
		const a = connect();
		await waitFor(a, "connect");
		a.emit("user:join", "Bruno");
		await waitFor(a, "user:joined");

		const b = connect();
		await waitFor(b, "connect");

		let joinedAgain = false;
		b.on("user:joined", () => {
			joinedAgain = true;
		});
		b.emit("user:join", "Bruno");
		await wait(150);

		expect(joinedAgain).toBe(false);
	});

	it("repassa message:send pra message:new com username e texto", async () => {
		const a = connect();
		await waitFor(a, "connect");
		a.emit("user:join", "Carla");
		await waitFor(a, "user:joined");

		const messagePromise = waitFor<{ username: string; text: string }>(
			a,
			"message:new",
		);
		a.emit("message:send", "oi");

		expect(await messagePromise).toEqual({ username: "Carla", text: "oi" });
	});

	it("nudge chega só pro alvo, não pra quem manda", async () => {
		const a = connect();
		const b = connect();
		await Promise.all([waitFor(a, "connect"), waitFor(b, "connect")]);

		a.emit("user:join", "Diana");
		await waitFor(a, "user:joined");
		b.emit("user:join", "Edu");
		await waitFor(b, "user:joined");

		let aReceivedNudge = false;
		a.on("nudge:received", () => {
			aReceivedNudge = true;
		});

		const nudgePromise = waitFor<{ from: string }>(b, "nudge:received");
		a.emit("nudge", "Edu");

		expect(await nudgePromise).toEqual({ from: "Diana" });
		expect(aReceivedNudge).toBe(false);
	});

	it("wink é broadcast pra todo mundo, incluindo quem mandou", async () => {
		const a = connect();
		const b = connect();
		await Promise.all([waitFor(a, "connect"), waitFor(b, "connect")]);

		a.emit("user:join", "Fabio");
		await waitFor(a, "user:joined");
		b.emit("user:join", "Gui");
		await waitFor(b, "user:joined");

		const aWinkPromise = waitFor<{ username: string; emoji: string }>(
			a,
			"wink:received",
		);
		const bWinkPromise = waitFor<{ username: string; emoji: string }>(
			b,
			"wink:received",
		);
		a.emit("wink:send", "🎉");

		expect(await aWinkPromise).toEqual({ username: "Fabio", emoji: "🎉" });
		expect(await bWinkPromise).toEqual({ username: "Fabio", emoji: "🎉" });
	});

	it("emite user:left quando a última conexão de um username desconecta", async () => {
		const a = connect();
		const b = connect();
		await Promise.all([waitFor(a, "connect"), waitFor(b, "connect")]);

		a.emit("user:join", "Helo");
		await waitFor(a, "user:joined");
		b.emit("user:join", "Ivo");
		await waitFor(b, "user:joined");

		const leftPromise = waitFor<string>(b, "user:left");
		a.close();
		clients = clients.filter((c) => c !== a);

		expect(await leftPromise).toBe("Helo");
	});
});
