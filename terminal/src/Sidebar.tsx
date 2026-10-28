import { Box, Text } from "ink";
import { colorForUsernameHex } from "shared";

interface Props {
	onlineUsers: string[];
}

export function Sidebar({ onlineUsers }: Props) {
	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="gray"
			paddingX={1}
			width={22}
			flexShrink={0}
		>
			<Text bold>LocalChat</Text>
			<Text dimColor>{onlineUsers.length} online</Text>
			<Box marginTop={1} flexDirection="column">
				{onlineUsers.map((username) => (
					<Text key={username} color={colorForUsernameHex(username)}>
						● {username}
					</Text>
				))}
			</Box>
		</Box>
	);
}
