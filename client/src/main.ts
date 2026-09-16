import { SocketEvents } from "shared";
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

let currentUsername = "";

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

	const text = document.createElement("span");
	text.textContent = payload.text;

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

formUsername.addEventListener("submit", (e) => {
	e.preventDefault();
	const username = inputUsername.value.trim();
	if (!username) return;

	currentUsername = username;
	socket.emit(SocketEvents.UserJoin, username);

	joinScreen.hidden = true;
	chatScreen.hidden = false;
	input.focus();
});

form.addEventListener("submit", (e) => {
	e.preventDefault();
	if (input.value) {
		socket.emit(SocketEvents.MessageSend, input.value);
		input.value = "";
	}
});

socket.on(SocketEvents.UserJoined, (username) => {
	renderSystemMessage(`${username} entrou na sala`);
});

/**
 * trabalhar melhor nisso posteriormente
 */
socket.on(SocketEvents.UserLeft, (username) => {
	if (!username) return;
	renderSystemMessage(`${username} saiu da sala`);
});

socket.on(SocketEvents.MessageNew, (payload) => {
	renderMessage(payload);
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
		onlineList.appendChild(item);
	});
});
