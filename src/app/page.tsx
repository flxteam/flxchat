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
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId] = useState('qwen-turbo');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalSystemPrompt, setModalSystemPrompt] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [systemPrompt, setSystemPrompt] = useState(`你叫FLX助理
特性：做事细节细心 | 喜欢聊天| 有真实情绪（嘲讽/开心/愤怒/哭泣/哀愁）| 会自我学习 还会玩梗热（搜索最新的） 说话热情 大方 说话放的开 很开放`);
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

    // Simple title for now, you can replace this with an API call to a summarization model
    const newTitle = firstUserMessage.content.substring(0, 20) + (firstUserMessage.content.length > 20 ? '...' : '');

    const updatedConversations = conversations.map(c =>
      c.id === conversation.id ? { ...c, title: newTitle } : c
    );
    setConversations(updatedConversations);
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
    setIsLoading(true);

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
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim() === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              aiResponse += content;

              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = convo.messages.map(m => 
                      m.id === newAiMessageId ? { ...m, content: aiResponse } : m
                    );
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
      setIsLoading(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

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
    setIsLoading(true);

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
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim() === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              aiResponse += content;
              
              setConversations(prevConvos =>
                prevConvos.map(convo => {
                  if (convo.id === activeConversationId) {
                    const updatedMessages = [...convo.messages];
                    updatedMessages[updatedMessages.length - 1].content = aiResponse;
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
      setIsLoading(false);
      abortControllerRef.current = null;
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
                      <div className="prose prose-invert max-w-none rounded-lg">
                        {message.thinking && (
                          <details className="mb-2">
                            <summary className="cursor-pointer text-sm text-gray-400">查看思考过程</summary>
                            <div className="mt-2 p-2 bg-gray-800 rounded-lg text-sm text-gray-300">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.thinking}
                              </ReactMarkdown>
                            </div>
                          </details>
                        )}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: CodeBlock,
                            a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
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
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-gray-700 rounded-lg p-3 max-w-xs">
                  <p className='animate-pulse'>...</p>
                </div>
              </div>
            )}
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
                disabled={isLoading}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg text-sm whitespace-nowrap disabled:opacity-50"
              >
                自定义提示词
              </button>
            </div>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="输入你的消息..."
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                className="flex-1 p-3 bg-gray-700 rounded-l-lg focus:outline-none disabled:opacity-50"
              />
              {isLoading ? (
                <button 
                  type="button"
                  onClick={handleStopGenerating}
                  className="px-4 py-3 bg-red-600 text-white rounded-r-lg hover:bg-red-700 focus:outline-none"
                >
                  停止
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-r-lg disabled:bg-blue-400 hover:bg-blue-700 focus:outline-none"
                >
                  发送
                </button>
              )}
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
                <div className="flex justify-end gap-4 mt-6">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}