import { describe, expect, it } from "vitest";
import { colorForUsername } from "./colorForUsername";

describe("colorForUsername", () => {
	it("retorna a mesma cor pro mesmo username sempre", () => {
		expect(colorForUsername("Pancha")).toBe(colorForUsername("Pancha"));
	});

	it("retorna cores diferentes pra usernames diferentes", () => {
		expect(colorForUsername("Pancha")).not.toBe(colorForUsername("Bruno"));
	});

	it("retorna uma cor no formato hsl(matiz, 65%, 45%)", () => {
		expect(colorForUsername("Carla")).toMatch(/^hsl\(\d+, 65%, 45%\)$/);
	});

	it("o matiz calculado fica sempre entre 0 e 359", () => {
		const match = colorForUsername("um-username-bem-longo-de-teste").match(
			/hsl\((\d+),/,
		);
		const hue = Number(match?.[1]);

		expect(hue).toBeGreaterThanOrEqual(0);
		expect(hue).toBeLessThan(360);
	});

	it("funciona com username vazio sem lançar erro", () => {
		expect(() => colorForUsername("")).not.toThrow();
	});
});
