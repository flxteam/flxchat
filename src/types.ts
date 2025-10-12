export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: string[]; // 附件，用于多模态
  thinking?: string; // AI的思考过程
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
}