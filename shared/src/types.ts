export interface ReplyPreview {
  id: string;
  username: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  createdAt: number;
  replyTo?: ReplyPreview;
}
