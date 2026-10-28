import { describe, expect, it } from "vitest";
import { typingIndicatorText } from "./typingIndicatorText";

describe("typingIndicatorText", () => {
	it("retorna null quando ninguém está digitando", () => {
		expect(typingIndicatorText([])).toBeNull();
	});

	it("uma pessoa digitando", () => {
		expect(typingIndicatorText(["Pancha"])).toBe("Pancha está digitando...");
	});

	it("duas pessoas digitando", () => {
		expect(typingIndicatorText(["Pancha", "Bruno"])).toBe(
			"Pancha e Bruno estão digitando...",
		);
	});

	it("três ou mais pessoas digitando", () => {
		expect(typingIndicatorText(["Pancha", "Bruno", "Carla"])).toBe(
			"Várias pessoas estão digitando...",
		);
	});
});
