import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// equivalente ao localStorage do client web, pra lembrar o username entre sessões
const CONFIG_DIR = join(homedir(), ".config", "localchat");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
	username?: string;
}

export function readConfig(): Config {
	try {
		return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
	} catch {
		return {};
	}
}

export function saveUsername(username: string): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}
	writeFileSync(CONFIG_FILE, JSON.stringify({ username }, null, 2));
}
