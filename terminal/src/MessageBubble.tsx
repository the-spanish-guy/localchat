import { Box, Text } from "ink";
import type { ChatMessage } from "shared";
import { colorForUsernameHex, linkify } from "shared";

// hyperlink OSC 8 — funciona em terminais modernos (iTerm2, Kitty, WezTerm,
// Windows Terminal); em terminais sem suporte, só mostra o texto puro
function hyperlink(url: string): string {
	return `\u001B]8;;${url}\u0007${url}\u001B]8;;\u0007`;
}

function renderText(text: string): string {
	return linkify(text)
		.map((part) => (part.type === "link" ? hyperlink(part.value) : part.value))
		.join("");
}

interface Props {
	message: ChatMessage;
	isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: Props) {
	return (
		<Box
			flexDirection="column"
			alignSelf={isOwn ? "flex-end" : "flex-start"}
			borderStyle="round"
			borderColor={isOwn ? "blue" : "gray"}
			paddingX={1}
			marginBottom={1}
		>
			{!isOwn && (
				<Text color={colorForUsernameHex(message.username)} bold>
					{message.username}
				</Text>
			)}
			<Text>{renderText(message.text)}</Text>
		</Box>
	);
}
