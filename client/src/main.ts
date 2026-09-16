import { SocketEvents } from "shared";
import { socket } from "./socket";

const form = document.querySelector<HTMLFormElement>("#form")!;
const input = document.querySelector<HTMLInputElement>("#input")!;

const formUsername = document.querySelector<HTMLFormElement>("#usernameForm")!;
const inputUsername =
	document.querySelector<HTMLInputElement>("#input-username")!;

const messages = document.querySelector<HTMLUListElement>("#messages")!;

formUsername.addEventListener("submit", (e) => {
	e.preventDefault();
	socket.emit(SocketEvents.UserJoin, inputUsername.value);
});

form.addEventListener("submit", (e) => {
	e.preventDefault();
	if (input.value) {
		socket.emit(SocketEvents.MessageSend, input.value);
		input.value = "";
	}
});

socket.on(SocketEvents.UserJoined, (message) => {
	const item = document.createElement("li");
	item.textContent = message;
	messages.appendChild(item);
	window.scrollTo(0, document.body.scrollHeight);
});

function renderMessage(payload: { username: string; text: string }) {
	const item = document.createElement("li");
	item.textContent = `Usuário: ${payload.username}
  Mensagem: ${payload.text}
  `;
	messages.appendChild(item);
	window.scrollTo(0, document.body.scrollHeight);
}

socket.on(SocketEvents.MessageNew, (payload) => {
	renderMessage(payload);
});

socket.on(SocketEvents.MessageHistory, (history) => {
	history.forEach(renderMessage);
});

/**
 * trabalhar melhor nisso posteriormente
 */
socket.on(SocketEvents.UserLeft, (username) => {
	if (!username) return;

	const item = document.createElement("li");
	item.textContent = `Usuário: ${username} deixou a sala`;
	messages.appendChild(item);
	window.scrollTo(0, document.body.scrollHeight);
});
