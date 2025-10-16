import React, { useState } from 'react';
import { Conversation } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit, FiTrash2, FiChevronsLeft, FiChevronsRight, FiPlus } from 'react-icons/fi';

interface HistoryProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  onNewChat: () => void;
}

const History = ({ conversations, activeConversationId, setActiveConversationId, setConversations, isCollapsed, setIsCollapsed, onNewChat }: HistoryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleSelectConversation = (id: string) => {
    if (id === activeConversationId) {
      setIsCollapsed(true);
    } else {
      setActiveConversationId(id);
      setIsCollapsed(true);
    }
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    if (activeConversationId === id) {
      if (updatedConversations.length > 0) {
        setActiveConversationId(updatedConversations[0].id);
      } else {
        onNewChat();
      }
    }
  };

  const handleStartEditing = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
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

  const sidebarVariants = {
    open: { width: '288px', transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { width: '80px', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  const itemVariants = {
    open: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
    closed: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isCollapsed ? 'closed' : 'open'}
      className="bg-surface/50 backdrop-blur-lg h-full flex flex-col rounded-r-2xl shadow-lg border-l border-white/10"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.h2 
              variants={itemVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="text-lg font-bold text-primary"
            >
              历史对话
            </motion.h2>
          )}
        </AnimatePresence>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 text-secondary hover:text-primary hover:bg-white/10 rounded-full transition-colors">
          {isCollapsed ? <FiChevronsRight size={20} /> : <FiChevronsLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {[...conversations].reverse().map((conversation, index) => (
          <motion.div
            key={conversation.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
            className={`rounded-lg mb-2 cursor-pointer group ${activeConversationId === conversation.id ? 'bg-accent/20' : 'hover:bg-white/5'}`}
            onClick={() => handleSelectConversation(conversation.id)}
          >
            <div className="p-3 flex justify-between items-center">
              {editingId === conversation.id ? (
                <input 
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleStopEditing(conversation.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStopEditing(conversation.id)}
                  className="bg-transparent text-primary w-full focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm text-primary truncate flex-1 pr-2">
                  {conversation.title}
                </span>
              )}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div 
                    variants={itemVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button onClick={(e) => handleStartEditing(e, conversation)} className="p-1 text-secondary hover:text-primary rounded-full">
                      <FiEdit size={14} />
                    </button>
                    <button onClick={(e) => handleDeleteConversation(e, conversation.id)} className="p-1 text-red-500 hover:text-red-400 rounded-full">
                      <FiTrash2 size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <motion.button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 p-3 bg-accent/80 hover:bg-accent text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiPlus size={20} />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span variants={itemVariants} initial="closed" animate="open" exit="closed">
                新对话
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default History;