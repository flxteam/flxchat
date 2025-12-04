'use client';

import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Conversation, ThinkingMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FiRefreshCw, FiEdit, FiTrash2, FiPaperclip, FiMic, FiSend } from 'react-icons/fi';
import Thinking from '@/components/thinking';
import History from '@/components/History';

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return !inline && match ? (
    <div className="relative group bg-surface rounded-lg my-2 text-sm">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-gray-800 rounded-t-lg">
        <span className="text-secondary text-xs font-sans">{match[1]}</span>
        <button 
          onClick={handleCopy}
          className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-sans py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          {isCopied ? '已复制!' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        style={a11yDark}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {codeText}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={`${className} bg-gray-700 text-white rounded-md px-1 py-0.5 text-sm font-mono`}>
      {children}
    </code>
  );
};

const MessageContent = ({ message, onRegenerate, onDelete, onSaveEdit }: {
  message: Message;
  onRegenerate: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onSaveEdit: (messageId: string, newContent: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    onSaveEdit(message.id, editedContent);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="w-full">
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full p-2 rounded-md bg-surface-variant text-primary border border-primary/20 focus:outline-none focus:ring-2 focus:ring-accent"
          rows={5}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={handleCancelEdit} className="px-3 py-1 rounded-md text-sm bg-gray-600 hover:bg-gray-500 text-white">取消</button>
          <button onClick={handleSave} className="px-3 py-1 rounded-md text-sm bg-accent hover:bg-accent-dark text-white">保存并重新生成</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full group relative prose prose-invert max-w-none prose-p:before:content-none prose-p:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ code: CodeBlock }}
      >
        {message.content}
      </ReactMarkdown>
      {message.role === 'assistant' && message.content && (
        <div className="absolute -bottom-2 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onRegenerate(message.id)} className="p-1 rounded-full hover:bg-white/10 text-secondary hover:text-primary"><FiRefreshCw size={14} /></button>
        </div>
      )}
      {message.role === 'user' && (
         <div className="absolute -bottom-2 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleStartEdit} className="p-1 rounded-full hover:bg-white/10 text-secondary hover:text-primary"><FiEdit size={14} /></button>
          <button onClick={() => onDelete(message.id)} className="p-1 rounded-full hover:bg-white/10 text-secondary hover:text-primary"><FiTrash2 size={14} /></button>
        </div>
      )}
    </div>
  );
};

const ThinkingIndicator = ({ text, isThinking, onToggle }: { text: string; isThinking: boolean; onToggle: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2 text-sm text-secondary"
  >
    <div className="w-5 h-5 flex items-center justify-center">
      <svg className="animate-spin h-4 w-4 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    <span>{text}</span>
    <button onClick={onToggle} className="ml-2 text-xs text-gray-400 hover:text-gray-200">
      {isThinking ? '隐藏思考' : '显示思考'}
    </button>
  </motion.div>
);

const useAudio = (isTtsEnabled: boolean, voice: string) => {
  const isSpeakingRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const processQueue = useCallback(async () => {
    if (isSpeakingRef.current || audioQueueRef.current.length === 0 || !isTtsEnabled) {
      return;
    }
    isSpeakingRef.current = true;
    const text = audioQueueRef.current.shift();
    if (!text) {
      isSpeakingRef.current = false;
      return;
    }

    try {
      const apiUrl = `/api/tts-proxy?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`TTS proxy request failed with status ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        isSpeakingRef.current = false;
        processQueue();
      };
    } catch (error) {
      console.error('Error in TTS processing:', error);
      isSpeakingRef.current = false;
      processQueue(); // Try next item in queue
    }
  }, [isTtsEnabled, voice]);

  const speak = useCallback((text: string) => {
    if (!isTtsEnabled || !text) return;

    const chunkText = (text: string, maxLength: number): string[] => {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
      }
      return chunks;
    };

    const textChunks = chunkText(text, 180);

    audioQueueRef.current.push(...textChunks.filter(s => s.trim().length > 0));
    if (!isSpeakingRef.current) {
      processQueue();
    }
  }, [isTtsEnabled, processQueue]);

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null; // Prevent onended from firing
      setCurrentAudio(null);
    }
    isSpeakingRef.current = false;
    audioQueueRef.current = [];
  }, [currentAudio]);

  return { speak, stop, isSpeaking: isSpeakingRef.current };
};

const MODELS = [
  { id: 'internlm/internlm2_5-7b-chat', name: 'InternLM2.5-7B-Chat' },
  { id: 'THUDM/GLM-Z1-9B-0414', name: 'GLM-Z1-9B' },
  { id: 'tencent/Hunyuan-MT-7B', name: '混元-MT-7B' },
  { id: 'THUDM/GLM-4.1V-9B-Thinking', name: 'GLM-4.1V-9B-Thinking' },
  { id: 'Qwen/Qwen3-8B', name: 'Qwen3-8B' },
  { id: 'Kwai-Kolors/Kolors', name: 'Kolors-Image-Generation' },
  { id: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B', name: 'DeepSeek-R1-Qwen3-8B' },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', name: 'DeepSeek-R1-Distill-Qwen-7B' },
  { id: 'TeleAI/TeleSpeechASR', name: 'TeleAI' },
];

const VOICES = [
  { id: '体虚生', name: '正常' },
  { id: '曼波', name: '曼波' },
];

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId] = useState('Qwen/Qwen3-8B');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalSystemPrompt, setModalSystemPrompt] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [useThinkingMode, setUseThinkingMode] = useState(true);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [ttsVoice, setTtsVoice] = useState('体虚生');
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [attachments, setAttachments] = useState<{ file: File; preview: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [systemPrompt, setSystemPrompt] = useState(`你叫FLX助理，由FLXTeam开发，是 FELIX 的专属AI助手。`);
  const abortControllerRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isInitialLoad = useRef(true);
  const { speak, stop } = useAudio(isTtsEnabled, ttsVoice);

  const onRegenerate = (messageId: string) => {
    const activeConversation = conversations.find(c => c.id === activeConversationId);
    if (!activeConversation) return;

    const messageIndex = activeConversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const messageToRegenerate = activeConversation.messages[messageIndex];
    if (messageToRegenerate.role !== 'user') return;

    const newMessages = activeConversation.messages.slice(0, messageIndex + 1);

    setConversations(conversations.map(c => 
      c.id === activeConversationId ? { ...c, messages: newMessages } : c
    ));

    setInput(messageToRegenerate.content);
    // Use a timeout to ensure the state update is processed before submitting
    setTimeout(() => {
      if (formRef.current) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        formRef.current.dispatchEvent(event);
      }
    }, 0);
  };

  useEffect(() => {
    if (isInitialLoad.current) {
      try {
        const storedConversations = localStorage.getItem('conversations');
        if (storedConversations) {
          const parsedConversations = JSON.parse(storedConversations);
          if (parsedConversations.length > 0) {
            setConversations(parsedConversations);
            const storedActiveId = localStorage.getItem('activeConversationId');
            if (storedActiveId && parsedConversations.some((c: Conversation) => c.id === storedActiveId)) {
              setActiveConversationId(storedActiveId);
            } else {
              setActiveConversationId(parsedConversations[0].id);
            }
          } else {
            handleNewChat();
          }
        } else {
          handleNewChat();
        }

        const storedModelId = localStorage.getItem('modelId');
        if (storedModelId && MODELS.some(m => m.id === storedModelId)) setModelId(storedModelId);
        
        const storedPrompt = localStorage.getItem('systemPrompt');
        if (storedPrompt !== null) setSystemPrompt(storedPrompt);

        const storedHistoryCollapsed = localStorage.getItem('isHistoryCollapsed');
        if (storedHistoryCollapsed) setIsHistoryCollapsed(JSON.parse(storedHistoryCollapsed));

        const storedThinkingMode = localStorage.getItem('useThinkingMode');
        if (storedThinkingMode) setUseThinkingMode(JSON.parse(storedThinkingMode));

        const storedUseSearch = localStorage.getItem('useSearch');
        if (storedUseSearch) setUseSearch(JSON.parse(storedUseSearch));

        const storedTtsEnabled = localStorage.getItem('isTtsEnabled');
        if (storedTtsEnabled) setIsTtsEnabled(JSON.parse(storedTtsEnabled));

        const storedTtsVoice = localStorage.getItem('ttsVoice');
        if (storedTtsVoice && VOICES.some(v => v.id === storedTtsVoice)) setTtsVoice(storedTtsVoice);

      } catch (error) {
        console.error("Failed to load from localStorage", error);
        // If loading fails, start with a fresh state
        handleNewChat();
      } finally {
        isInitialLoad.current = false;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) return; // Don't save state until initial load is complete
    localStorage.setItem('conversations', JSON.stringify(conversations));
    if (activeConversationId) {
      localStorage.setItem('activeConversationId', activeConversationId);
    }
    localStorage.setItem('modelId', modelId);
    localStorage.setItem('systemPrompt', systemPrompt);
    localStorage.setItem('isHistoryCollapsed', JSON.stringify(isHistoryCollapsed));
    localStorage.setItem('useThinkingMode', JSON.stringify(useThinkingMode));
    localStorage.setItem('useSearch', JSON.stringify(useSearch));
    localStorage.setItem('isTtsEnabled', JSON.stringify(isTtsEnabled));
    localStorage.setItem('ttsVoice', ttsVoice);
  }, [conversations, activeConversationId, modelId, systemPrompt, isHistoryCollapsed, useThinkingMode, useSearch, isTtsEnabled, ttsVoice]);

  const generateConversationTitle = async (conversation: Conversation) => {
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation.messages.slice(0, 2) }),
      });
      if (!response.ok) return;
      const { title } = await response.json();
      if (title) {
        setConversations(prevConvos =>
          prevConvos.map(c => (c.id === conversation.id ? { ...c, title } : c))
        );
      }
    } catch (error) {
      console.error('Error generating conversation title:', error);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const conversationToUpdate = conversations.find(convo => 
      convo.id === activeConversationId &&
      convo.messages.length === 2 &&
      convo.title.startsWith('新对话')
    );
    if (conversationToUpdate) generateConversationTitle(conversationToUpdate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, activeConversationId, isLoading]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation ? activeConversation.messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOpenPromptModal = () => {
    setModalSystemPrompt(systemPrompt);
    setIsPromptModalOpen(true);
  };

  const handleClosePromptModal = () => setIsPromptModalOpen(false);

  const handleSavePrompt = () => {
    setSystemPrompt(modalSystemPrompt);
    setIsPromptModalOpen(false);
  };

  const handleResetPrompt = () => {
    setModalSystemPrompt(`你叫FLX助理，由FLXTeam开发，是 FELIX 的专属AI助手。`);
  };

  const handleRegenerate = async (messageId: string) => {
    stop();
    if (!activeConversationId || isLoading) return;
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation) return;
    const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex < 1) return;
    const messagesForApi = currentConversation.messages.slice(0, messageIndex);
    const assistantPlaceholder: Message = { id: uuidv4(), role: 'assistant', content: '', thinking: '重新思考中...' };
    setConversations(prevConvos => prevConvos.map(c => c.id === activeConversationId ? { ...c, messages: [...messagesForApi, assistantPlaceholder] } : c));
    await fetchAndStreamResponse(messagesForApi, []);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeConversationId) return;
    setConversations(convos => convos.map(c => {
      if (c.id === activeConversationId) {
        const messageIndex = c.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          return { ...c, messages: c.messages.slice(0, messageIndex) };
        }
      }
      return c;
    }));
  };

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    if (!activeConversationId || isLoading) return;
    const convoToUpdate = conversations.find(c => c.id === activeConversationId);
    if (!convoToUpdate) return;

    const messageIndex = convoToUpdate.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const newMessages = convoToUpdate.messages.slice(0, messageIndex);
    const editedUserMessage: Message = { ...convoToUpdate.messages[messageIndex], content: newContent };
    newMessages.push(editedUserMessage);

    const assistantPlaceholder: Message = { id: uuidv4(), role: 'assistant', content: '', thinking: '编辑后重新思考中...' };
    newMessages.push(assistantPlaceholder);

    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: newMessages } : c));

    await fetchAndStreamResponse(newMessages.slice(0, -1), []);
  };

  const fetchAndStreamResponse = async (messagesForApi: Message[], files: File[]) => {
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append('messages', JSON.stringify(messagesForApi));
    formData.append('modelId', modelId);
    formData.append('systemPrompt', systemPrompt);
    formData.append('useSearch', JSON.stringify(useSearch));
    formData.append('useThinkingMode', JSON.stringify(useThinkingMode));
    files.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.substring(6);
            if (rawData === '[DONE]') {
              setIsLoading(false);
              return;
            }
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.type === 'thinking') {
                setConversations(prevConvos =>
                  prevConvos.map(c => {
                    if (c.id === activeConversationId) {
                      const lastMessage = c.messages[c.messages.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        return {
                          ...c,
                          messages: [
                            ...c.messages.slice(0, -1),
                            { ...lastMessage, thinking: (lastMessage.thinking || '') + parsed.content },
                          ],
                        };
                      }
                    }
                    return c;
                  })
                );
              } else if (parsed.type === 'chunk') {
                setConversations(prevConvos =>
                  prevConvos.map(c => {
                    if (c.id === activeConversationId) {
                      const lastMessage = c.messages[c.messages.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        const newContent = lastMessage.content + parsed.content;
                        speak(parsed.content);
                        return {
                          ...c,
                          messages: [
                            ...c.messages.slice(0, -1),
                            { ...lastMessage, content: newContent },
                          ],
                        };
                      }
                    }
                    return c;
                  })
                );
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching stream:', error);
        setConversations(prevConvos =>
          prevConvos.map(c => {
            if (c.id === activeConversationId) {
              const lastMessage = c.messages[c.messages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                return {
                  ...c,
                  messages: [
                    ...c.messages.slice(0, -1),
                    { ...lastMessage, content: `发生错误: ${error.message}` },
                  ],
                };
              }
            }
            return c;
          })
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;

    stop();

    const userMessage: Message = { id: uuidv4(), role: 'user', content: input };
    const assistantPlaceholder: Message = { id: uuidv4(), role: 'assistant', content: '', thinking: '思考中...' };

    let messagesForApi: Message[];
    if (activeConversation && activeConversation.messages.length > 0) {
      setConversations(prevConvos =>
        prevConvos.map(c =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, userMessage, assistantPlaceholder] }
            : c
        )
      );
      messagesForApi = [...activeConversation.messages, userMessage];
    } else {
      const newConversation: Conversation = {
        id: activeConversationId || uuidv4(),
        title: input.substring(0, 20) || '新对话',
        messages: [userMessage, assistantPlaceholder],
        systemPrompt: systemPrompt,
      };
      if (!conversations.find(c => c.id === newConversation.id)) {
        setConversations(prev => [...prev, newConversation]);
      } else {
        setConversations(prev => prev.map(c => c.id === newConversation.id ? newConversation : c));
      }
      setActiveConversationId(newConversation.id);
      messagesForApi = [userMessage];
    }

    setInput('');
    setAttachments([]);

    await fetchAndStreamResponse(messagesForApi, attachments.map(a => a.file));
  };

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleStartRecording = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          await handleSendAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("无法访问麦克风，请检查权限。");
      }
    } else {
      alert("您的浏览器不支持录音功能。");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '语音识别失败');
      }
      const data = await response.json();
      setInput(prevInput => prevInput + data.text);
      // Automatically submit after transcription
      setTimeout(() => formRef.current?.requestSubmit(), 100);
    } catch (error) {
      console.error("Error transcribing audio:", error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (input.trim() && !isLoading) formRef.current?.requestSubmit();
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        let { width, height } = img;
        const MAX_DIM = 2048;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(err);
      };
    });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleNewChat = () => {
    const newConversation: Conversation = { id: uuidv4(), title: `新对话 ${conversations.length + 1}`, messages: [] };
    setConversations(prev => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      stop();
    }
    setIsLoading(false);
  };

  const handleDeleteConversation = (conversationId: string) => {
    const newConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(newConversations);
    if (activeConversationId === conversationId) {
      setActiveConversationId(newConversations.length > 0 ? newConversations[0].id : null);
    }
  };

  const handleEditConversation = (conversationId: string, newTitle: string) => {
    setConversations(prevConvos =>
      prevConvos.map(c => (c.id === conversationId ? { ...c, title: newTitle } : c))
    );
  };

  return (
    <div className="flex h-screen bg-background text-primary font-sans animate-fade-in">
      <History 
        conversations={conversations}
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        onDeleteConversation={handleDeleteConversation}
        onEditConversation={handleEditConversation}
        isCollapsed={isHistoryCollapsed}
        setIsCollapsed={setIsHistoryCollapsed}
        onNewChat={handleNewChat}
      />
      <div className="relative flex flex-1 flex-col bg-surface">
        <header className="bg-background/80 backdrop-blur-sm border-b border-border-color p-2 sm:p-4 flex justify-between items-center gap-2 sm:gap-4 z-10">
          <h1 className="text-xl font-bold text-primary">FLXChat</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <button onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)} className="px-3 py-2 bg-surface rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center gap-2">
                <span className="truncate max-w-[120px] sm:max-w-none">{MODELS.find(m => m.id === modelId)?.name || 'Select Model'}</span>
                <svg className={`w-4 h-4 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              <AnimatePresence>
                {isModelSelectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-48 sm:w-full bg-surface border border-border-color rounded-md shadow-lg z-20"
                  >
                    {MODELS.map(model => (
                      <div key={model.id} onClick={() => { setModelId(model.id); setIsModelSelectorOpen(false); }} className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm">
                        {model.name}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={handleNewChat} className="bg-accent hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm whitespace-nowrap transition-colors">
              <span className="hidden sm:inline">新对话</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          <div className="flex flex-col space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div 
                  key={message.id} 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex items-start gap-2 sm:gap-3 max-w-[90%]`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm">
                      A
                    </div>
                  )}
                  <div key={message.id} className={`w-full flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-full sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] px-3 sm:px-4 py-2 rounded-2xl ${message.role === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-surface text-primary rounded-bl-none'}`}>
                      <MessageContent 
                        message={message} 
                        onRegenerate={onRegenerate}
                        onDelete={handleDeleteMessage} 
                        onSaveEdit={handleSaveEdit} 
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="p-2 sm:p-4 bg-surface-dp1 rounded-b-lg shadow-inner">
          <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              {attachments.length > 0 && (
                <div className="p-2 bg-surface-dp2 rounded-t-md flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="relative group bg-surface-dp3 rounded-md p-1">
                      {attachment.file.type.startsWith('image/') ? (
                        <img src={attachment.preview} alt={attachment.file.name} className="h-16 w-16 object-cover rounded-md" />
                      ) : (
                        <div className="h-16 w-16 flex flex-col items-center justify-center bg-surface-dp4 rounded-md">
                          <span className="text-xs text-text-secondary truncate w-full px-1 text-center">{attachment.file.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                placeholder="输入消息... (Shift + Enter 换行)"
                className="w-full p-3 pr-28 bg-surface-dp2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-shadow duration-200 text-sm placeholder-text-secondary"
                style={{ minHeight: '52px', maxHeight: '200px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <label htmlFor="file-upload" className="cursor-pointer p-2 rounded-full hover:bg-surface-dp3">
                  <FiPaperclip className="text-text-secondary" />
                </label>
                <input id="file-upload" type="file" multiple onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`p-2 rounded-full ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-surface-dp3'}`}>
                  <FiMic className={`text-text-secondary ${isRecording ? 'text-white' : ''}`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={isThinking || !input.trim() && attachments.length === 0} className="self-end bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200">
              <FiSend />
            </button>
          </form>
          <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-secondary">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-1">
                <input type="checkbox" id="tts-toggle" checked={isTTS} onChange={() => setIsTTS(!isTTS)} className="form-checkbox h-4 w-4 text-primary bg-surface-dp3 rounded focus:ring-primary" />
                <label htmlFor="tts-toggle">语音合成</label>
              </div>
              <div className="flex items-center gap-1">
                <input type="checkbox" id="internet-toggle" checked={useInternet} onChange={() => setUseInternet(!useInternet)} className="form-checkbox h-4 w-4 text-primary bg-surface-dp3 rounded focus:ring-primary" />
                <label htmlFor="internet-toggle">联网</label>
              </div>
            </div>
            <button onClick={() => setShowCustomPrompt(true)} className="w-full sm:w-auto bg-surface-dp3 hover:bg-surface-dp4 text-text-primary py-1 px-3 rounded-md transition-colors duration-200">
              自定义提示词
            </button>
          </div>
        </footer>

        <AnimatePresence>
          {isPromptModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-2xl border border-border-color">
                <h2 className="text-xl font-bold mb-4 text-primary">自定义系统提示词</h2>
                <textarea placeholder="告诉 FLXAI 如何表现，例如：你是一个代码专家，请用中文回答。" value={modalSystemPrompt} onChange={(e) => setModalSystemPrompt(e.target.value)} className="w-full p-3 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-base resize-y border border-border-color" rows={10} />
                <div className="flex justify-between items-center mt-6">
                  <div>
                    <button type="button" onClick={handleResetPrompt} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg mr-2 transition-colors">复位</button>
                    <button type="button" onClick={() => setModalSystemPrompt('')} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">清除</button>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleClosePromptModal} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lggit ad transition-colors">取消</button>
                    <button onClick={handleSavePrompt} className="bg-accent hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">保存</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}