import { describe, expect, it } from "vitest";
import { isImageUrl } from "./isImageUrl";

describe("isImageUrl", () => {
	it("reconhece extensões de imagem comuns", () => {
		expect(isImageUrl("https://example.com/cat.png")).toBe(true);
		expect(isImageUrl("https://example.com/cat.jpg")).toBe(true);
		expect(isImageUrl("https://example.com/cat.gif")).toBe(true);
	});

	it("ignora caixa alta/baixa na extensão", () => {
		expect(isImageUrl("https://example.com/cat.GIF")).toBe(true);
	});

	it("ignora query string ao checar a extensão", () => {
		expect(isImageUrl("https://example.com/cat.gif?resize=200")).toBe(true);
	});

	it("retorna false pra link comum sem extensão de imagem", () => {
		expect(isImageUrl("https://example.com")).toBe(false);
		expect(isImageUrl("https://example.com/pagina.html")).toBe(false);
	});

	it("retorna false pra url inválida", () => {
		expect(isImageUrl("não é uma url")).toBe(false);
	});
});
