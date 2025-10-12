import React, { useState } from 'react';
import { Conversation } from '@/types';

interface HistoryProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
}

const History = ({ conversations, activeConversationId, setActiveConversationId, setConversations }: HistoryProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    if (activeConversationId === id) {
      if (updatedConversations.length > 0) {
        setActiveConversationId(updatedConversations[0].id);
      } else {
        // Handle case where all conversations are deleted
        // You might want to create a new one here.
      }
    }
  };

  const handleStartEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const handleStopEditing = (id: string) => {
    if (editingTitle.trim()) {
      const updatedConversations = conversations.map(c => 
        c.id === id ? { ...c, title: editingTitle.trim() } : c
      );
      setConversations(updatedConversations);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <div className={`bg-gray-800 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64 p-4'}`}>
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
        {!isCollapsed && <h2 className="text-lg font-bold">历史对话</h2>}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-gray-700 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isCollapsed ? 
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /> : 
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            }
          </svg>
        </button>
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conversation => (
            <div 
              key={conversation.id} 
              className={`p-2 my-1 rounded-md cursor-pointer flex justify-between items-center ${activeConversationId === conversation.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            >
              {editingId === conversation.id ? (
                <input 
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleStopEditing(conversation.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStopEditing(conversation.id)}
                  className="bg-gray-600 text-white w-full rounded-md p-1 text-sm focus:outline-none"
                  autoFocus
                />
              ) : (
                <span onClick={() => handleSelectConversation(conversation.id)} className="text-sm flex-1 truncate pr-2">
                  {conversation.title}
                </span>
              )}
              <div className="flex items-center">
                  <button onClick={() => handleStartEditing(conversation)} className="p-1 hover:bg-gray-600 rounded-full text-gray-400 hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L17.5 2.5z" /></svg>
                  </button>
                  <button onClick={() => handleDeleteConversation(conversation.id)} className="p-1 hover:bg-gray-600 rounded-full text-gray-400 hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;