'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation } from '@/types';

interface HistoryProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const History = ({ conversations, activeConversationId, setActiveConversationId, setConversations, isCollapsed, setIsCollapsed }: HistoryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelectConversation = (id: string) => {
    if (editingId !== id) {
      setActiveConversationId(id);
    }
  };

  const handleDeleteConversation = (id: string) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    if (activeConversationId === id) {
      const newActiveId = updatedConversations.length > 0 ? updatedConversations[0].id : null;
      if (newActiveId) {
        setActiveConversationId(newActiveId);
      }
    }
  };

  const handleStartEditing = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleSaveEdit = (id:string) => {
    if (editingTitle.trim() === '') {
        handleDeleteConversation(id);
    } else {
        const updatedConversations = conversations.map(c =>
          c.id === id ? { ...c, title: editingTitle } : c
        );
        setConversations(updatedConversations);
    }
    setEditingId(null);
    setEditingTitle('');
  };


  const panelVariants = {
    open: { width: 260, transition: { type: "spring", stiffness: 400, damping: 40 } },
    closed: { width: 60, transition: { type: "spring", stiffness: 400, damping: 40 } },
  };

  const titleVariants = {
    open: { opacity: 1, display: 'block', transition: { delay: 0.1 } },
    closed: { opacity: 0, display: 'none', transition: { duration: 0.1 } },
  }

  const firstCharVariants = {
    open: { opacity: 0, display: 'none', transition: { duration: 0.1 } },
    closed: { opacity: 1, display: 'block', transition: { delay: 0.1 } },
  }

  return (
    <>
      <motion.div
        variants={panelVariants}
        initial={false}
        animate={isCollapsed ? "closed" : "open"}
        className="h-full bg-gray-800/50 flex flex-col"
      >
        <div className="flex-shrink-0 p-2">
          {/* New Chat button can go here */}
        </div>

        <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 px-2">
          {[...conversations].reverse().map(conversation => (
            <motion.div
              key={conversation.id}
              onMouseEnter={() => setHoveredId(conversation.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelectConversation(conversation.id)}
              className={`relative rounded-lg p-3 my-1 text-sm cursor-pointer transition-colors duration-200 ${ activeConversationId === conversation.id ? 'bg-blue-500/30' : 'hover:bg-gray-700/70' }`}
              layout
            >
              {editingId === conversation.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleSaveEdit(conversation.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(conversation.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-full bg-transparent text-white focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center justify-center">
                   <motion.span
                      variants={firstCharVariants}
                      className="font-bold text-lg"
                   >
                      {conversation.title.charAt(0)}
                   </motion.span>
                   <motion.span
                      variants={titleVariants}
                      className="whitespace-nowrap overflow-hidden text-ellipsis block w-full"
                   >
                      {conversation.title}
                   </motion.span>
                </div>
              )}

              <AnimatePresence>
              {!isCollapsed && hoveredId === conversation.id && editingId !== conversation.id && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center bg-gray-700/70 rounded-md"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditing(conversation.id, conversation.title);
                    }}
                    className="p-1.5 text-gray-300 hover:text-white"
                    aria-label="Edit title"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 5.232z" />
                    </svg>
                  </button>
                  <div className="w-px h-4 bg-gray-500/50"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                    className="p-1.5 text-gray-300 hover:text-white"
                    aria-label="Delete conversation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 z-10 w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-full focus:outline-none transform -translate-y-1/2 transition-all duration-300"
        style={{ left: isCollapsed ? '48px' : '248px' }}
        aria-label={isCollapsed ? 'Expand history' : 'Collapse history'}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </motion.svg>
      </button>
    </>
  );
};

export default History;