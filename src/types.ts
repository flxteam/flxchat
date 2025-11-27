export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string; // 新增：用于存储TTS音频链接
  attachments?: string[]; // 附件，用于多模态
  thinking?: string; // AI的思考过程
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
}

export interface ThinkingMessage {
  id: string;
  role: 'assistant';
  content: string;
}