import { socket } from "./socket";

const form = document.querySelector<HTMLFormElement>("#form")!;
const input = document.querySelector<HTMLInputElement>("#input")!;

const formUsername = document.querySelector<HTMLFormElement>("#usernameForm")!;
const inputUsername = document.querySelector<HTMLInputElement>("#input-username")!;

const messages = document.querySelector<HTMLUListElement>("#messages")!;

formUsername.addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("user:join", inputUsername.value);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("message:send", input.value);
    input.value = "";
  }
});

socket.on("user:joined", (message: string) => {
  const item = document.createElement("li");
  item.textContent = message;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

// TODO: socket.on("message:new", (payload: { username: string; text: string }) => { ... })
