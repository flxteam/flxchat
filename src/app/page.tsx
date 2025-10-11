'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
    <div className="relative group">
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
  { id: 'Qwen/Qwen2-7B-Instruct', name: 'Qwen2-7B' },
  { id: 'tencent/Hunyuan-MT-7B', name: '混元-MT-7B' },
  { id: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B', name: 'DeepSeek 定制' },
  { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4-9B' },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalSystemPrompt, setModalSystemPrompt] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem('chatHistory');
      if (storedMessages) setMessages(JSON.parse(storedMessages));
      
      const storedPrompt = localStorage.getItem('systemPrompt');
      if (storedPrompt) setSystemPrompt(storedPrompt);

      const storedModelId = localStorage.getItem('modelId');
      if (storedModelId && MODELS.some(m => m.id === storedModelId)) setModelId(storedModelId);

      const storedThinkingMode = localStorage.getItem('useThinkingMode');
      if (storedThinkingMode) setUseThinkingMode(JSON.parse(storedThinkingMode));

      const storedUseSearch = localStorage.getItem('useSearch');
      if (storedUseSearch) setUseSearch(JSON.parse(storedUseSearch));
    } catch (error) {
      console.error("Failed to load from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
      }
      localStorage.setItem('systemPrompt', systemPrompt);
      localStorage.setItem('modelId', modelId);
      localStorage.setItem('useThinkingMode', JSON.stringify(useThinkingMode));
      localStorage.setItem('useSearch', JSON.stringify(useSearch));
    } catch (error) {
      console.error("Failed to save to localStorage", error);
    }
  }, [messages, systemPrompt, modelId, useThinkingMode, useSearch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleNewChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem('chatHistory');
    } catch (error) {
      console.error("Failed to clear chat history from localStorage", error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let finalInput = input;
    if (useThinkingMode) {
      finalInput = `请一步一步思考，然后回答问题。问题： ${input}`;
    }

    const userMessage: Message = { role: 'user', content: finalInput };
    const displayMessage: Message = { role: 'user', content: input };

    const newMessages = [...messages, displayMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage], systemPrompt, modelId, useSearch }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '' }]);

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
              setMessages(prevMessages => {
                const updatedMessages = [...prevMessages];
                updatedMessages[updatedMessages.length - 1].content = aiResponse;
                return updatedMessages;
              });
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '抱歉，出错了。请重试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-gray-900 text-white">
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
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{ code: CodeBlock }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
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
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 bg-blue-600 text-white rounded-r-lg disabled:bg-blue-400 hover:bg-blue-700 focus:outline-none"
            >
              {isLoading ? '...' : '发送'}
            </button>
          </div>
        </form>
      </footer>

      {isPromptModalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
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
        </div>
      )}
    </div>
  );
}