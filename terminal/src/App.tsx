import { randomUUID } from "node:crypto";
import type { WriteStream } from "node:tty";
import { Box, Text, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "shared";
import { SocketEvents, typingIndicatorText } from "shared";
import { MessageBubble } from "./MessageBubble";
import { Sidebar } from "./Sidebar";
import { readConfig, saveUsername } from "./config";
import { socket } from "./socket";

type TimelineEntry =
	| { kind: "message"; message: ChatMessage }
	| { kind: "system"; id: string; text: string };

const TYPING_TIMEOUT_MS = 2000;
// altura aproximada de uma bolha (autor + texto + 2 bordas); heurística pra
// caber na tela sem precisar de scroll de verdade (fica pra depois)
const LINES_PER_ENTRY = 4;
const RESERVED_ROWS = 10;

// o tipo de `stdout` do hook do ink é o NodeJS.WritableStream genérico, mas
// em runtime é sempre o process.stdout real (um tty.WriteStream com rows)
function getRows(stdout: NodeJS.WritableStream): number {
	return (stdout as WriteStream).rows ?? 24;
}

export function App() {
	const { stdout } = useStdout();
	const [screen, setScreen] = useState<"join" | "chat">("join");
	const [usernameInput, setUsernameInput] = useState("");
	const [username, setUsername] = useState("");
	const [messageInput, setMessageInput] = useState("");
	const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
	const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
	const [typingUsers, setTypingUsers] = useState<string[]>([]);
	const [rows, setRows] = useState(() => getRows(stdout));

	const isTypingRef = useRef(false);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const usernameRef = useRef("");

	useEffect(() => {
		const saved = readConfig().username;
		if (saved) {
			usernameRef.current = saved;
			setUsername(saved);
			setScreen("chat");
			socket.emit(SocketEvents.UserJoin, saved);
		}
	}, []);

	useEffect(() => {
		const onResize = () => setRows(getRows(stdout));
		stdout.on("resize", onResize);
		return () => {
			stdout.off("resize", onResize);
		};
	}, [stdout]);

	useEffect(() => {
		function onUserJoined(joinedUsername: string) {
			setTimeline((prev) => [
				...prev,
				{ kind: "system", id: randomUUID(), text: `${joinedUsername} entrou na sala` },
			]);
		}

		function onUserLeft(leftUsername: string) {
			if (!leftUsername) return;
			setTimeline((prev) => [
				...prev,
				{ kind: "system", id: randomUUID(), text: `${leftUsername} saiu da sala` },
			]);
			setTypingUsers((prev) => prev.filter((name) => name !== leftUsername));
		}

		function onUserTyping({ username: who, isTyping }: { username: string; isTyping: boolean }) {
			setTypingUsers((prev) => {
				if (isTyping) return prev.includes(who) ? prev : [...prev, who];
				return prev.filter((name) => name !== who);
			});
		}

		function onMessageNew(message: ChatMessage) {
			setTimeline((prev) => [...prev, { kind: "message", message }]);
		}

		function onMessageHistory(history: ChatMessage[]) {
			setTimeline((prev) => [
				...history.map((message): TimelineEntry => ({ kind: "message", message })),
				...prev,
			]);
		}

		function onOnlineUsers(usernames: string[]) {
			setOnlineUsers(usernames);
		}

		function onReconnect() {
			if (usernameRef.current) {
				socket.emit(SocketEvents.UserJoin, usernameRef.current);
			}
		}

		socket.on(SocketEvents.UserJoined, onUserJoined);
		socket.on(SocketEvents.UserLeft, onUserLeft);
		socket.on(SocketEvents.UserTyping, onUserTyping);
		socket.on(SocketEvents.MessageNew, onMessageNew);
		socket.on(SocketEvents.MessageHistory, onMessageHistory);
		socket.on(SocketEvents.OnlineUsers, onOnlineUsers);
		socket.io.on("reconnect", onReconnect);

		return () => {
			socket.off(SocketEvents.UserJoined, onUserJoined);
			socket.off(SocketEvents.UserLeft, onUserLeft);
			socket.off(SocketEvents.UserTyping, onUserTyping);
			socket.off(SocketEvents.MessageNew, onMessageNew);
			socket.off(SocketEvents.MessageHistory, onMessageHistory);
			socket.off(SocketEvents.OnlineUsers, onOnlineUsers);
			socket.io.off("reconnect", onReconnect);
		};
	}, []);

	function stopTyping() {
		clearTimeout(typingTimeoutRef.current);
		if (!isTypingRef.current) return;
		isTypingRef.current = false;
		socket.emit(SocketEvents.TypingStop);
	}

	function handleJoinSubmit(value: string) {
		const trimmed = value.trim();
		if (!trimmed) return;
		usernameRef.current = trimmed;
		saveUsername(trimmed);
		setUsername(trimmed);
		setScreen("chat");
		socket.emit(SocketEvents.UserJoin, trimmed);
	}

	function handleMessageChange(value: string) {
		setMessageInput(value);
		if (!isTypingRef.current) {
			isTypingRef.current = true;
			socket.emit(SocketEvents.TypingStart);
		}
		clearTimeout(typingTimeoutRef.current);
		typingTimeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
	}

	function handleMessageSubmit(value: string) {
		if (!value) return;
		stopTyping();
		socket.emit(SocketEvents.MessageSend, { text: value });
		setMessageInput("");
	}

	if (screen === "join") {
		return (
			<Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
				<Text bold>LocalChat</Text>
				<Text dimColor>Sem cadastro — só um nome pra entrar.</Text>
				<Box marginTop={1}>
					<Text>Seu nome: </Text>
					<TextInput
						value={usernameInput}
						onChange={setUsernameInput}
						onSubmit={handleJoinSubmit}
					/>
				</Box>
			</Box>
		);
	}

	const visibleCount = Math.max(3, Math.floor((rows - RESERVED_ROWS) / LINES_PER_ENTRY));
	const visibleTimeline = timeline.slice(-visibleCount);
	const typingText = typingIndicatorText(typingUsers.filter((name) => name !== username));

	return (
		<Box flexDirection="column">
			<Box>
				<Sidebar onlineUsers={onlineUsers} />
				<Box flexDirection="column" flexGrow={1} paddingX={1}>
					{visibleTimeline.map((entry) =>
						entry.kind === "system" ? (
							<Box key={entry.id} alignSelf="center">
								<Text dimColor italic>
									{entry.text}
								</Text>
							</Box>
						) : (
							<MessageBubble
								key={entry.message.id}
								message={entry.message}
								isOwn={entry.message.username === username}
							/>
						),
					)}
					<Box minHeight={1}>
						{typingText && <Text dimColor italic>{typingText}</Text>}
					</Box>
				</Box>
			</Box>
			<Box borderStyle="round" paddingX={1}>
				<Text>{"> "}</Text>
				<TextInput
					value={messageInput}
					onChange={handleMessageChange}
					onSubmit={handleMessageSubmit}
					placeholder="Digite uma mensagem"
				/>
			</Box>
		</Box>
	);
}
