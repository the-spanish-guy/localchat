export type LinkifyPart =
	| { type: "text"; value: string }
	| { type: "link"; value: string };

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function linkify(text: string): LinkifyPart[] {
	return text
		.split(URL_PATTERN)
		.filter((part) => part.length > 0)
		.map((part) =>
			/^https?:\/\//.test(part)
				? { type: "link" as const, value: part }
				: { type: "text" as const, value: part },
		);
}
