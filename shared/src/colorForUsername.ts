function hueForUsername(username: string): number {
	let hash = 0;
	for (let i = 0; i < username.length; i++) {
		hash = (hash << 5) - hash + username.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash) % 360;
}

export function colorForUsername(username: string): string {
	return `hsl(${hueForUsername(username)}, 65%, 45%)`;
}

// mesma cor por usuário que colorForUsername, mas em hex — terminais não
// entendem hsl() (chalk/ink só aceitam hex, rgb() ou ansi256)
export function colorForUsernameHex(username: string): string {
	return hslToHex(hueForUsername(username), 65, 45);
}

function hslToHex(h: number, s: number, l: number): string {
	s /= 100;
	l /= 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) =>
		l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const toHex = (n: number) =>
		Math.round(f(n) * 255)
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}
