import { describe, expect, it } from "vitest";
import { linkify } from "./linkify";

describe("linkify", () => {
	it("mantém texto sem link como um único pedaço de texto", () => {
		expect(linkify("oi tudo bem?")).toEqual([
			{ type: "text", value: "oi tudo bem?" },
		]);
	});

	it("identifica uma URL http/https no meio do texto", () => {
		expect(linkify("olha isso https://example.com legal")).toEqual([
			{ type: "text", value: "olha isso " },
			{ type: "link", value: "https://example.com" },
			{ type: "text", value: " legal" },
		]);
	});

	it("identifica múltiplos links na mesma mensagem", () => {
		expect(linkify("http://a.com e http://b.com")).toEqual([
			{ type: "link", value: "http://a.com" },
			{ type: "text", value: " e " },
			{ type: "link", value: "http://b.com" },
		]);
	});

	it("mensagem que é só um link vira só um pedaço de link", () => {
		expect(linkify("https://example.com")).toEqual([
			{ type: "link", value: "https://example.com" },
		]);
	});

	it("string vazia retorna array vazio", () => {
		expect(linkify("")).toEqual([]);
	});
});
