import { EventEmitter } from "node:events";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
	readConfig: () => ({}),
	saveUsername: () => {},
}));

function createMockSocket() {
	const emitter = new EventEmitter();
	return Object.assign(emitter, {
		connected: false,
		io: new EventEmitter(),
	});
}

const mockSocket = createMockSocket();

vi.mock("./socket", () => ({
	SERVER_URL: "http://localhost:9999",
	socket: mockSocket,
}));

const { App } = await import("./App");

// eventos do socket chegam fora do ciclo de eventos do React (vêm de um
// EventEmitter comum), então o re-render não é síncrono — precisa de um
// tick pra o ink terminar de commitar o novo frame
function nextTick() {
	return new Promise((resolve) => setTimeout(resolve, 50));
}

describe("App — status de conexão", () => {
	afterEach(() => {
		mockSocket.removeAllListeners();
	});

	it("mostra 'conectando' assim que a tela abre", () => {
		const { lastFrame } = render(<App />);
		expect(lastFrame()).toContain("conectando em http://localhost:9999");
	});

	it("mostra o erro quando o socket não consegue conectar", async () => {
		const { lastFrame } = render(<App />);
		mockSocket.emit("connect_error", new Error("ECONNREFUSED"));
		await nextTick();
		expect(lastFrame()).toContain("sem conexão com http://localhost:9999");
		expect(lastFrame()).toContain("ECONNREFUSED");
	});

	it("esconde o status assim que conecta", async () => {
		const { lastFrame } = render(<App />);
		mockSocket.emit("connect");
		await nextTick();
		expect(lastFrame()).not.toContain("conectando");
		expect(lastFrame()).not.toContain("sem conexão");
	});
});
