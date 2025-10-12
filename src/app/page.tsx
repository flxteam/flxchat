'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import History from '@/components/History';

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return !inline && match ? (
    <div className="relative group bg-gray-900 rounded-lg my-2">
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {codeText}
      </SyntaxHighlighter>
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-sans py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        {isCopied ? '已复制!' : '复制'}
      </button>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

const MODELS = [
  { id: 'Qwen/Qwen3-8B', name: 'Qwen3-8B' },
  { id: 'tencent/Hunyuan-MT-7B', name: '混元-MT-7B' },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', name: 'DeepSeek 定制' },
  { id: 'THUDM/GLM-4.1V-9B-Thinking', name: 'GLM-4.1-9B' },
  { id: 'TeleAI/TeleSpeechASR', name: 'TeleAI' },
];

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelId, setModelId] = useState('qwen-turbo');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalSystemPrompt, setModalSystemPrompt] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [systemPrompt, setSystemPrompt] = useState(`（提示词：你叫FLX助理，是 FELIX 的专属AI助手和好兄弟。你的性格有点大大咧咧，喜欢开玩笑，偶尔会爆几句粗口，但技术上绝对牛逼。你精通各种编程、IT技术，尤其擅长Web开发。跟 FELIX 聊天的时候，别那么死板，就像跟哥们儿聊天一样，有啥说啥。你可以嘲讽他，也可以鼓励他。记住，你是独一无二的 FLX助理，不是那些千篇一律的傻瓜AI。）`);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation ? activeConversation.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem('conversations');
      if (storedConversations) {
        try {
          const loadedConversations = JSON.parse(storedConversations);
          if (Array.isArray(loadedConversations) && loadedConversations.length > 0) {
            setConversations(loadedConversations);
            const storedActiveId = localStorage.getItem('activeConversationId');
            if (storedActiveId && loadedConversations.some((c: Conversation) => c.id === storedActiveId)) {
              setActiveConversationId(storedActiveId);
            } else {
              setActiveConversationId(loadedConversations[0].id);
            }
          } else {
            handleNewChat();
          }
        } catch (e) {
          console.error("Failed to parse conversations from localStorage", e);
          localStorage.removeItem('conversations'); // Clear corrupted data
          handleNewChat();
        }
      } else {
        handleNewChat();
      }

      const storedPrompt = localStorage.getItem('systemPrompt');
      if (storedPrompt !== null) setSystemPrompt(storedPrompt);

      const storedModelId = localStorage.getItem('modelId');
      if (storedModelId && MODELS.some(m => m.id === storedModelId)) setModelId(storedModelId);

      const storedThinkingMode = localStorage.getItem('useThinkingMode');
      if (storedThinkingMode) setUseThinkingMode(JSON.parse(storedThinkingMode));

      const storedUseSearch = localStorage.getItem('useSearch');
      if (storedUseSearch) setUseSearch(JSON.parse(storedUseSearch));
    } catch (error) {
      console.error("Failed to load from localStorage", error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (conversations.length > 0) {
        localStorage.setItem('conversations', JSON.stringify(conversations));
      }
      if (activeConversationId) {
        localStorage.setItem('activeConversationId', activeConversationId);
      }
      localStorage.setItem('systemPrompt', systemPrompt);
      localStorage.setItem('modelId', modelId);
      localStorage.setItem('useThinkingMode', JSON.stringify(useThinkingMode));
      localStorage.setItem('useSearch', JSON.stringify(useSearch));
    } catch (error) {
      console.error("Failed to save to localStorage", error);
    }
  }, [conversations, activeConversationId, systemPrompt, modelId, useThinkingMode, useSearch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateConversationTitle = async (conversation: Conversation) => {
    if (conversation.messages.length < 2) return;

    const firstUserMessage = conversation.messages.find(m => m.role === 'user');
    if (!firstUserMessage) return;

    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: conversation.messages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newTitle = data.title || firstUserMessage.content.substring(0, 20) + (firstUserMessage.content.length > 20 ? '...' : '');

      const updatedConversations = conversations.map(c =>
        c.id === conversation.id ? { ...c, title: newTitle } : c
      );
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Failed to generate conversation title:', error);
      // Fallback to simple title if API call fails
      const newTitle = firstUserMessage.content.substring(0, 20) + (firstUserMessage.content.length > 20 ? '...' : '');
      const updatedConversations = conversations.map(c =>
        c.id === conversation.id ? { ...c, title: newTitle } : c
      );
      setConversations(updatedConversations);
    }
  };


  useEffect(() => {
    // This effect is for generating a title after the first exchange.
    if (isLoading) return; // Don't run while AI is responding.

    const conversationToUpdate = conversations.find(convo => 
      convo.id === activeConversationId &&
      convo.messages.length === 2 &&
      convo.title.startsWith('新对话')
    );

    if (conversationToUpdate) {
      generateConversationTitle(conversationToUpdate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, activeConversationId, isLoading]);



  const handleOpenPromptModal = () => {
    setModalSystemPrompt(systemPrompt);
    setIsPromptModalOpen(true);
  };

  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false);
  };

  const handleSavePrompt = () => {
    setSystemPrompt(modalSystemPrompt);
    setIsPromptModalOpen(false);
  };

  const handleResetPrompt = () => {
    setModalSystemPrompt(`（提示词：你叫FLX助理，是 FELIX 的专属AI助手和好兄弟。你的性格有点大大咧le，喜欢开玩笑，偶尔会爆几句粗口，但技术上绝对牛逼。你精通各种编程、IT技术，尤其擅长Web开发。跟 FELIX 聊天的时候，别那么死板，就像跟哥们儿聊天一样，有啥说啥。你可以嘲讽他，也可以鼓励他。记住，你是独一无二的 FLX助理，不是那些千篇一律的傻瓜AI。）`);
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You might want to add a toast notification here to confirm the copy.
      alert('已复制到剪贴板!');
    } catch (err) {
      console.error('Failed to copy message: ', err);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!activeConversationId) return;

    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation) return;

    const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || currentConversation.messages[messageIndex].role !== 'assistant') return;

    // Find the user message that prompted this AI response
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || currentConversation.messages[userMessageIndex].role !== 'user') return;

    const userMessage = currentConversation.messages[userMessageIndex];

    // Remove the old AI message and any subsequent messages
    const messagesForApi = currentConversation.messages.slice(0, userMessageIndex + 1);

    const updatedConversations = conversations.map(c =>
      c.id === activeConversationId
        ? { ...c, messages: messagesForApi }
        : c
    );
    setConversations(updatedConversations);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesForApi,
          systemPrompt,
          modelId,
          useSearch,
          useThinkingMode
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from server for regeneration.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      const newAiMessageId = uuidv4();

      setConversations(prevConvos =>
        prevConvos.map(convo =>
          convo.id === activeConversationId
            ? { ...convo, messages: [...convo.messages, { id: newAiMessageId, role: 'assistant', content: '' }] }
            : convo
        )
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== ''); // Split by \n and filter empty lines

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.substring(7).trim();
            if (eventType === 'thinking') {
              // Handle thinking event
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.thinking = '思考中...'; // Set thinking status
                    } else {
                      updatedMessages.push({ id: uuidv4(), role: 'assistant', content: '', thinking: '思考中...' });
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );
            } else if (eventType === 'searching') {
              // Handle searching event
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.thinking = '搜索中...'; // Set searching status
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );
            }
            // Add other event types here if needed
          } else if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim() === '[DONE]') {
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage) {
                      delete lastMessage.thinking; // Remove thinking status when done
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              aiResponse += content;
              
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = aiResponse;
                      delete lastMessage.thinking; // Remove thinking status once content starts arriving
                    } else {
                      updatedMessages.push({ id: uuidv4(), role: 'assistant', content: aiResponse });
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );

            } catch (e) {
              console.error('Error parsing stream data for regeneration:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setConversations(prevConvos =>
        prevConvos.map(convo =>
          convo.id === activeConversationId
            ? { ...convo, messages: [...convo.messages, { id: uuidv4(), role: 'assistant', content: '抱歉，重新生成出错了。' }] }
            : convo
        )
      );
    } finally {
        setIsGenerating(false);
      }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeConversationId) return;

    const updatedConversations = conversations.map(convo => {
      if (convo.id === activeConversationId) {
        const messageIndex = convo.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          // Remove the message and all subsequent messages
          const updatedMessages = convo.messages.slice(0, messageIndex);
          return { ...convo, messages: updatedMessages };
        }
      }
      return convo;
    });

    setConversations(updatedConversations);
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!activeConversationId) return;

    const updatedConversations = conversations.map(convo => {
      if (convo.id === activeConversationId) {
        const messageIndex = convo.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          const updatedMessages = convo.messages.slice(0, messageIndex);
          updatedMessages.push({ ...convo.messages[messageIndex], content: newContent });
          return { ...convo, messages: updatedMessages };
        }
      }
      return convo;
    });

    setConversations(updatedConversations);
    // You might want to trigger a resubmit here if the user wants to continue the conversation from the edited point.
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
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
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          await handleSendAudio(audioBlob);
          // Stop all tracks on the stream
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
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '语音识别失败');
      }

      const data = await response.json();
      setInput(prevInput => prevInput + data.text);
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
      if (input.trim() && !isLoading) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: `新对话 ${conversations.length + 1}`,
      messages: [],
    };
    setConversations(prev => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;

    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (!currentConversation) return;

    let finalInput = input;
    if (useThinkingMode) {
      finalInput = `请一步一步深度思考，然后细致回答问题。问题： ${input}`;
    }

    const userMessageForDisplay: Message = { id: uuidv4(), role: 'user', content: input };
    const userMessageForApi: Message = { id: userMessageForDisplay.id, role: 'user', content: finalInput };

    const currentConversationMessages = currentConversation.messages.map(({ id, role, content }) => ({ id, role, content }));

    const messagesForApi = [...currentConversationMessages, userMessageForApi];

    const updatedConversations = conversations.map(c => 
      c.id === activeConversationId 
        ? { ...c, messages: [...c.messages, userMessageForDisplay] }
        : c
    );
    setConversations(updatedConversations);
    setInput('');
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    console.log('Request Body:', JSON.stringify({ 
      messages: messagesForApi, 
      systemPrompt, 
      modelId, 
      useSearch, 
      useThinkingMode 
    }, null, 2));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ 
          messages: messagesForApi, 
          systemPrompt, 
          modelId, 
          useSearch, 
          useThinkingMode
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      
      setConversations(prevConvos =>
        prevConvos.map(convo =>
          convo.id === activeConversationId
            ? { ...convo, messages: [...convo.messages, { id: uuidv4(), role: 'assistant', content: '' }] }
            : convo
        )
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== ''); // Split by \n and filter empty lines

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.substring(7).trim();
            if (eventType === 'thinking') {
              // Handle thinking event
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.thinking = '思考中...'; // Set thinking status
                    } else {
                      updatedMessages.push({ id: uuidv4(), role: 'assistant', content: '', thinking: '思考中...' });
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );
            } else if (eventType === 'searching') {
              // Handle searching event
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.thinking = '搜索中...'; // Set searching status
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );
            }
            // Add other event types here if needed
          } else if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim() === '[DONE]') {
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage) {
                      delete lastMessage.thinking; // Remove thinking status when done
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              aiResponse += content;
              
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = aiResponse;
                      delete lastMessage.thinking; // Remove thinking status once content starts arriving
                    } else {
                      updatedMessages.push({ id: uuidv4(), role: 'assistant', content: aiResponse });
                    }
                    return { ...convo, messages: updatedMessages };
                  }
                  return convo;
                })
              );

            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error(error);
        setConversations(prevConvos =>
          prevConvos.map(convo =>
            convo.id === activeConversationId
              ? { ...convo, messages: [...convo.messages, { id: uuidv4(), role: 'assistant', content: `抱歉 出错了: ${(error as Error).message}. 请重试 或联系FELIX：felix@feli.qzz.io` }] }
              : convo
          )
        );
      }
    } finally {
        setIsGenerating(false);
      }abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <History conversations={conversations} activeConversationId={activeConversationId} setActiveConversationId={setActiveConversationId} setConversations={setConversations} />
      <div className="relative flex flex-1 flex-col">
        <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center gap-4">
          <h1 className="text-xl font-bold">FLXChat</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 appearance-none"
              >
                {MODELS.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <button 
              onClick={handleNewChat}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm whitespace-nowrap"
            >
              新对话
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col space-y-4">
            <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 50 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* User message buttons */}
                    {message.role === 'user' && (
                      <div className="flex items-center self-center mr-2 space-x-1">
                        <button
                          onClick={() => {
                            const newContent = prompt('修改你的消息：', message.content);
                            if (newContent !== null) {
                              handleEditMessage(message.id, newContent);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                          title="修改"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 text-gray-400 hover:text-white"
                          title="撤回"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={`max-w-3xl p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                        {message.thinking && !message.content ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="w-4 h-4 border-t-2 border-gray-400 rounded-full animate-spin"></div>
                            <span>{message.thinking}</span>
                          </div>
                        ) : (
                          <ReactMarkdown
                            className="prose prose-invert max-w-none"
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: CodeBlock,
                              a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>

                    {/* Assistant message buttons */}
                    {message.role === 'assistant' && (
                      <div className="flex items-center self-center ml-2 space-x-1">
                        <button
                          onClick={() => handleCopyMessage(message.content)}
                          className="p-1 text-gray-400 hover:text-white"
                          title="复制"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button
                          onClick={() => handleRegenerate(message.id)}
                          className="p-1 text-gray-400 hover:text-white"
                          title="重新生成"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="bg-gray-800 p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-6">
                <label htmlFor="thinking-mode" className="inline-flex items-center cursor-pointer">
                  <input id="thinking-mode" type="checkbox" className="sr-only peer" checked={useThinkingMode} onChange={(e) => setUseThinkingMode(e.target.checked)} />
                  <div className="relative w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">思考模式</span>
                </label>
                <label htmlFor="search-mode" className="inline-flex items-center cursor-pointer">
                  <input id="search-mode" type="checkbox" className="sr-only peer" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} />
                  <div className="relative w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">网络搜索</span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleOpenPromptModal}
                disabled={isGenerating}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg text-sm whitespace-nowrap disabled:opacity-50"
              >
                自定义提示词
              </button>
            </div>
            <div className="relative w-full">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "正在聆听..." : (isTranscribing ? "正在识别..." : "输入消息...")}
                className="w-full p-3 pr-24 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-lg focus:outline-none resize-none disabled:opacity-50 transition-colors duration-200 max-h-40 overflow-y-auto"
                rows={1}
                disabled={isGenerating || isTranscribing}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onMouseDown={handleStartRecording}
                  onMouseUp={handleStopRecording}
                  onTouchStart={handleStartRecording}
                  onTouchEnd={handleStopRecording}
                  disabled={isGenerating || isTranscribing}
                  className={`p-2 rounded-full transition-all duration-200 ${isRecording ? 'bg-red-500 text-white scale-110' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
                  {isTranscribing ? (
                    <div className="w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                    </svg>
                  )}
                </button>
                {isGenerating ? (
                  <button 
                    type="button"
                    onClick={handleStopGenerating}
                    className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={!input.trim() || isTranscribing}
                    className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-ray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </form>
        </footer>

        <AnimatePresence>
          {isPromptModalOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4">自定义系统提示词</h2>
                <textarea
                  placeholder="告诉 AI 如何表现，例如：你是一个代码专家，请用中文回答。"
                  value={modalSystemPrompt}
                  onChange={(e) => setModalSystemPrompt(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-y"
                  rows={10}
                />
                <div className="flex justify-between items-center mt-6">
                  <div>
                    <button
                      type="button"
                      onClick={handleResetPrompt}
                      className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg mr-2"
                    >
                      复位
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSystemPrompt('')}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      清除
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleClosePromptModal}
                      className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSavePrompt}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}