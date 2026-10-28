import type { ChatMessage } from "shared";
import { SocketEvents } from "shared";
import { colorForUsername } from "./colorForUsername";
import { isImageUrl } from "./isImageUrl";
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

const replyPreview = document.querySelector<HTMLDivElement>("#reply-preview")!;
const replyPreviewAuthor =
	document.querySelector<HTMLSpanElement>("#reply-preview-author")!;
const replyPreviewText =
	document.querySelector<HTMLSpanElement>("#reply-preview-text")!;
const replyPreviewCancel =
	document.querySelector<HTMLButtonElement>("#reply-preview-cancel")!;

let currentUsername = "";
let replyingTo: { id: string; username: string; text: string } | null = null;

const THEME_STORAGE_KEY = "localchat:theme";

const THEMES = [
	"light",
	"dark",
	"tokyo-night",
	"dracula",
	"nord",
	"catppuccin",
	"abyss-void",
	"abyss-dusk",
	"abyss-dawn",
	"abyss-ember",
] as const;
type Theme = (typeof THEMES)[number];

const THEME_ICONS: Record<Theme, string> = {
	light: "🌙",
	dark: "🌆",
	"tokyo-night": "🧛",
	dracula: "❄️",
	nord: "☕",
	catppuccin: "☀️",
	"abyss-void": "🕳️",
	"abyss-dusk": "🌌",
	"abyss-dawn": "🌅",
	"abyss-ember": "🔥",
};

function isTheme(value: string | undefined): value is Theme {
	return !!value && (THEMES as readonly string[]).includes(value);
}

function getEffectiveTheme(): Theme {
	const explicit = document.documentElement.dataset.theme;
	if (isTheme(explicit)) return explicit;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(theme: Theme | null) {
	if (theme) {
		document.documentElement.dataset.theme = theme;
	} else {
		delete document.documentElement.dataset.theme;
	}
	// o ícone mostra o PRÓXIMO tema do ciclo, não o atual — é o que o clique vai aplicar
	const currentIndex = THEMES.indexOf(getEffectiveTheme());
	const next = THEMES[(currentIndex + 1) % THEMES.length];
	themeToggle.textContent = THEME_ICONS[next];
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
applyTheme(isTheme(savedTheme ?? undefined) ? (savedTheme as Theme) : null);

themeToggle.addEventListener("click", () => {
	const currentIndex = THEMES.indexOf(getEffectiveTheme());
	const next = THEMES[(currentIndex + 1) % THEMES.length];
	localStorage.setItem(THEME_STORAGE_KEY, next);
	applyTheme(next);
});

const DEFAULT_TITLE = document.title;
const NEW_MESSAGE_TITLE = `Nova mensagem · ${DEFAULT_TITLE}`;
const BLINK_INTERVAL_MS = 2000;

let blinkInterval: ReturnType<typeof setInterval> | undefined;

const notificationSound = new Audio("/notificacao2.mp3");
notificationSound.preload = "auto";
notificationSound.load();

/**
 * navegadores só deixam tocar áudio com som depois de algum gesto do
 * usuário na página (clique, tecla etc) — com o login automático
 * (username salvo), a página carrega sem nenhum clique, então a
 * notificação sonora fica bloqueada silenciosamente até a pessoa
 * interagir com a aba pela primeira vez. Isso "destrava" o som de
 * propósito, tocando e pausando na hora, assim que a primeira
 * interação acontecer.
 */
function unlockNotificationSound() {
	notificationSound
		.play()
		.then(() => {
			notificationSound.pause();
			notificationSound.currentTime = 0;
			document.removeEventListener("pointerdown", unlockNotificationSound);
			document.removeEventListener("keydown", unlockNotificationSound);
		})
		.catch(() => {
			// ainda bloqueado, tenta de novo na próxima interação
		});
}
document.addEventListener("pointerdown", unlockNotificationSound);
document.addEventListener("keydown", unlockNotificationSound);

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
		const sound = notificationSound.cloneNode(true) as HTMLAudioElement;
		sound.play().catch((err) => {
			console.warn("[chat] não consegui tocar o som de notificação:", err);
		});

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

function scrollToMessage(id: string) {
	const target = messages.querySelector<HTMLLIElement>(
		`[data-message-id="${CSS.escape(id)}"]`,
	);
	if (!target) return;

	target.scrollIntoView({ behavior: "smooth", block: "center" });
	target.classList.remove("highlight");
	void target.offsetWidth; // força reflow pra reiniciar a animação
	target.classList.add("highlight");
}

function startReply(target: { id: string; username: string; text: string }) {
	replyingTo = target;
	replyPreviewAuthor.textContent = target.username;
	replyPreviewText.textContent = target.text;
	replyPreview.hidden = false;
	input.focus();
}

function cancelReply() {
	replyingTo = null;
	replyPreview.hidden = true;
}

replyPreviewCancel.addEventListener("click", cancelReply);

function renderMessage(payload: ChatMessage) {
	const username = payload.username || "desconhecido";
	const item = document.createElement("li");
	item.className = "message";
	item.dataset.messageId = payload.id;
	const isOwn = username === currentUsername;
	if (isOwn) {
		item.classList.add("own");
	}

	const author = document.createElement("span");
	author.className = "author";
	author.textContent = username;
	author.style.color = colorForUsername(username);

	item.append(author);

	if (payload.replyTo) {
		const replyTo = payload.replyTo;
		const quote = document.createElement("button");
		quote.type = "button";
		quote.className = "reply-quote";
		quote.addEventListener("click", () => scrollToMessage(replyTo.id));

		const quoteAuthor = document.createElement("span");
		quoteAuthor.className = "reply-quote-author";
		quoteAuthor.textContent = replyTo.username;
		if (!isOwn) {
			quoteAuthor.style.color = colorForUsername(replyTo.username);
		}

		const quoteText = document.createElement("span");
		quoteText.className = "reply-quote-text";
		quoteText.textContent = replyTo.text;

		quote.append(quoteAuthor, quoteText);
		item.appendChild(quote);
	}

	const text = document.createElement("span");
	const imageUrls: string[] = [];
	for (const part of linkify(payload.text)) {
		if (part.type === "link") {
			if (isImageUrl(part.value)) {
				imageUrls.push(part.value);
				continue;
			}
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

	item.append(text);

	const replyBtn = document.createElement("button");
	replyBtn.type = "button";
	replyBtn.className = "reply-btn";
	replyBtn.textContent = "↩";
	replyBtn.setAttribute("aria-label", "Responder");
	replyBtn.addEventListener("click", () =>
		startReply({ id: payload.id, username, text: payload.text }),
	);
	item.appendChild(replyBtn);

	for (const url of imageUrls) {
		const link = document.createElement("a");
		link.className = "image-link";
		link.href = url;
		link.target = "_blank";
		link.rel = "noopener noreferrer";

		const img = document.createElement("img");
		img.className = "message-image";
		img.src = url;
		img.alt = "imagem compartilhada";
		img.loading = "lazy";
		img.onerror = () => {
			img.remove();
			link.textContent = url;
		};

		link.appendChild(img);
		item.appendChild(link);
	}

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

socket.io.on("reconnect", () => {
	if (currentUsername) {
		socket.emit(SocketEvents.UserJoin, currentUsername);
	}
});

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
		socket.emit(SocketEvents.MessageSend, {
			text: input.value,
			replyToId: replyingTo?.id,
		});
		input.value = "";
		cancelReply();
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
	for (const payload of history) {
		try {
			renderMessage(payload);
		} catch (err) {
			console.error(
				"[chat] falha ao renderizar mensagem do histórico:",
				err,
				payload,
			);
		}
	}
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
