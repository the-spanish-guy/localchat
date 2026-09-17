import { SocketEvents } from "shared";
import { colorForUsername } from "./colorForUsername";
import { linkify } from "./linkify";
import { socket } from "./socket";

const joinScreen = document.querySelector<HTMLDivElement>("#join-screen")!;
const chatScreen = document.querySelector<HTMLDivElement>("#chat-screen")!;

const formUsername = document.querySelector<HTMLFormElement>("#usernameForm")!;
const inputUsername =
	document.querySelector<HTMLInputElement>("#input-username")!;

const form = document.querySelector<HTMLFormElement>("#form")!;
const input = document.querySelector<HTMLInputElement>("#input")!;

const messages = document.querySelector<HTMLUListElement>("#messages")!;
const onlineList = document.querySelector<HTMLUListElement>("#online-list")!;
const onlineCount = document.querySelector<HTMLSpanElement>("#online-count")!;
const typingIndicator =
	document.querySelector<HTMLParagraphElement>("#typing-indicator")!;
const winkOverlay = document.querySelector<HTMLDivElement>("#wink-overlay")!;
const winksBar = document.querySelector<HTMLDivElement>("#winks-bar")!;
const themeToggle = document.querySelector<HTMLButtonElement>("#theme-toggle")!;

let currentUsername = "";

const THEME_STORAGE_KEY = "localchat:theme";

function getEffectiveTheme(): "light" | "dark" {
	const explicit = document.documentElement.dataset.theme;
	if (explicit === "light" || explicit === "dark") return explicit;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(theme: "light" | "dark" | null) {
	if (theme) {
		document.documentElement.dataset.theme = theme;
	} else {
		delete document.documentElement.dataset.theme;
	}
	themeToggle.textContent = getEffectiveTheme() === "dark" ? "☀️" : "🌙";
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : null);

themeToggle.addEventListener("click", () => {
	const next = getEffectiveTheme() === "dark" ? "light" : "dark";
	localStorage.setItem(THEME_STORAGE_KEY, next);
	applyTheme(next);
});

const DEFAULT_TITLE = document.title;
const NEW_MESSAGE_TITLE = `Nova mensagem · ${DEFAULT_TITLE}`;
const BLINK_INTERVAL_MS = 2000;

let blinkInterval: ReturnType<typeof setInterval> | undefined;

function startBlinkingTitle() {
	if (blinkInterval) return;

	document.title = NEW_MESSAGE_TITLE;
	blinkInterval = setInterval(() => {
		document.title =
			document.title === NEW_MESSAGE_TITLE ? DEFAULT_TITLE : NEW_MESSAGE_TITLE;
	}, BLINK_INTERVAL_MS);
}

function stopBlinkingTitle() {
	clearInterval(blinkInterval);
	blinkInterval = undefined;
	document.title = DEFAULT_TITLE;
}

function notifyNewMessage() {
	if (document.hidden) {
		startBlinkingTitle();
	}
}

function triggerNudge() {
	document.body.classList.remove("nudge");
	void document.body.offsetWidth; // força reflow pra reiniciar a animação
	document.body.classList.add("nudge");
}

function playWink(username: string, emoji: string) {
	winkOverlay.textContent = "";

	const emojiEl = document.createElement("span");
	emojiEl.className = "wink-emoji";
	emojiEl.textContent = emoji;

	const captionEl = document.createElement("span");
	captionEl.className = "wink-caption";
	captionEl.textContent = username;

	winkOverlay.append(emojiEl, captionEl);
	winkOverlay.hidden = false;

	winkOverlay.classList.remove("playing");
	void winkOverlay.offsetWidth; // força reflow pra reiniciar a animação
	winkOverlay.classList.add("playing");
}

winkOverlay.addEventListener("animationend", () => {
	winkOverlay.hidden = true;
});

document.addEventListener("visibilitychange", () => {
	if (!document.hidden) {
		stopBlinkingTitle();
	}
});

const TYPING_TIMEOUT_MS = 2000;
let isTyping = false;
let typingTimeout: ReturnType<typeof setTimeout> | undefined;
const typingUsers = new Set<string>();

function scrollToBottom() {
	messages.scrollTop = messages.scrollHeight;
}

function renderMessage(payload: { username: string; text: string }) {
	const item = document.createElement("li");
	item.className = "message";
	if (payload.username === currentUsername) {
		item.classList.add("own");
	}

	const author = document.createElement("span");
	author.className = "author";
	author.textContent = payload.username;
	author.style.color = colorForUsername(payload.username);

	const text = document.createElement("span");
	for (const part of linkify(payload.text)) {
		if (part.type === "link") {
			const link = document.createElement("a");
			link.href = part.value;
			link.textContent = part.value;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			text.appendChild(link);
		} else {
			text.appendChild(document.createTextNode(part.value));
		}
	}

	item.append(author, text);
	messages.appendChild(item);
	scrollToBottom();
}

function renderSystemMessage(text: string) {
	const item = document.createElement("li");
	item.className = "system";
	item.textContent = text;
	messages.appendChild(item);
	scrollToBottom();
}

function renderTypingIndicator() {
	const names = Array.from(typingUsers);

	if (names.length === 0) {
		typingIndicator.hidden = true;
		typingIndicator.textContent = "";
		return;
	}

	typingIndicator.hidden = false;
	if (names.length === 1) {
		typingIndicator.textContent = `${names[0]} está digitando...`;
	} else if (names.length === 2) {
		typingIndicator.textContent = `${names[0]} e ${names[1]} estão digitando...`;
	} else {
		typingIndicator.textContent = "Várias pessoas estão digitando...";
	}
}

function stopTyping() {
	clearTimeout(typingTimeout);
	if (!isTyping) return;
	isTyping = false;
	socket.emit(SocketEvents.TypingStop);
}

const USERNAME_STORAGE_KEY = "localchat:username";

function enterChat(username: string) {
	currentUsername = username;
	localStorage.setItem(USERNAME_STORAGE_KEY, username);
	socket.emit(SocketEvents.UserJoin, username);

	joinScreen.hidden = true;
	chatScreen.hidden = false;
	input.focus();
}

formUsername.addEventListener("submit", (e) => {
	e.preventDefault();
	const username = inputUsername.value.trim();
	if (!username) return;

	enterChat(username);
});

const savedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
if (savedUsername) {
	enterChat(savedUsername);
}

input.addEventListener("input", () => {
	if (!isTyping) {
		isTyping = true;
		socket.emit(SocketEvents.TypingStart);
	}
	clearTimeout(typingTimeout);
	typingTimeout = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
});

form.addEventListener("submit", (e) => {
	e.preventDefault();
	if (input.value) {
		stopTyping();
		socket.emit(SocketEvents.MessageSend, input.value);
		input.value = "";
	}
});

winksBar.querySelectorAll<HTMLButtonElement>(".wink-btn").forEach((btn) => {
	btn.addEventListener("click", () => {
		const emoji = btn.dataset.emoji;
		if (emoji) socket.emit(SocketEvents.WinkSend, emoji);
	});
});

socket.on(SocketEvents.UserJoined, (username) => {
	renderSystemMessage(`${username} entrou na sala`);
});

socket.on(SocketEvents.UserLeft, (username) => {
	if (!username) return;
	renderSystemMessage(`${username} saiu da sala`);
	typingUsers.delete(username);
	renderTypingIndicator();
});

socket.on(SocketEvents.UserTyping, ({ username, isTyping: typing }) => {
	if (typing) {
		typingUsers.add(username);
	} else {
		typingUsers.delete(username);
	}
	renderTypingIndicator();
});

socket.on(SocketEvents.MessageNew, (payload) => {
	renderMessage(payload);
	if (payload.username !== currentUsername) {
		notifyNewMessage();
	}
});

socket.on(SocketEvents.NudgeReceived, ({ from }) => {
	renderSystemMessage(`${from} chamou sua atenção!`);
	triggerNudge();
});

socket.on(SocketEvents.WinkReceived, ({ username, emoji }) => {
	playWink(username, emoji);
});

socket.on(SocketEvents.MessageHistory, (history) => {
	history.forEach(renderMessage);
});

socket.on(SocketEvents.OnlineUsers, (usernames) => {
	onlineCount.textContent = String(usernames.length);
	onlineList.innerHTML = "";
	usernames.forEach((username) => {
		const item = document.createElement("li");
		item.textContent = username;
		item.style.color = colorForUsername(username);

		if (username !== currentUsername) {
			item.classList.add("nudgeable");
			item.title = `Chamar atenção de ${username}`;
			item.addEventListener("click", () => {
				socket.emit(SocketEvents.Nudge, username);
			});
		}

		onlineList.appendChild(item);
	});
});
