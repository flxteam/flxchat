export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string; // AI的思考过程
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
}