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
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    if (activeConversationId === id) {
      setActiveConversationId(updatedConversations.length > 0 ? updatedConversations[0].id : null);
    }
  };

  const handleEditConversation = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleSaveEdit = (id: string) => {
    const updatedConversations = conversations.map(c =>
      c.id === id ? { ...c, title: editingTitle } : c
    );
    setConversations(updatedConversations);
    setEditingId(null);
  };

  const panelVariants = {
    open: { width: 260, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { width: 60, transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  const itemVariants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: -20 },
  };

  return (
    <motion.div
      variants={panelVariants}
      initial={false}
      animate={isCollapsed ? "closed" : "open"}
      className="relative h-full bg-gray-800/50 border-r border-gray-700/50 flex flex-col p-2"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3.5 z-10 w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-full focus:outline-none transform -translate-y-1/2"
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

      <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {[...conversations].reverse().map(conversation => (
          <motion.div
            key={conversation.id}
            onMouseEnter={() => setHoveredId(conversation.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleSelectConversation(conversation.id)}
            className={`relative rounded-lg p-3 my-1 text-sm cursor-pointer transition-colors duration-200 ${
              activeConversationId === conversation.id ? 'bg-blue-500/30' : 'hover:bg-gray-700/70'
            }`}
          >
            {editingId === conversation.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleSaveEdit(conversation.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(conversation.id)}
                className="w-full bg-transparent text-white focus:outline-none"
                autoFocus
              />
            ) : (
              <AnimatePresence>
                <motion.span
                  variants={itemVariants}
                  className="whitespace-nowrap overflow-hidden text-ellipsis block"
                >
                  {isCollapsed ? conversation.title.charAt(0) : conversation.title}
                </motion.span>
              </AnimatePresence>
            )}

            {!isCollapsed && hoveredId === conversation.id && editingId !== conversation.id && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center bg-gray-700/70 rounded-md"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditConversation(conversation.id, conversation.title);
                  }}
                  className="p-1.5 text-gray-300 hover:text-white"
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
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default History;