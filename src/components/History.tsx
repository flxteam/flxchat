import React, { useState, useEffect, useRef } from 'react';
import { Conversation } from '@/types';
import { motion, AnimatePresence, Variants } from 'framer-motion';
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
  const historyRef = useRef<HTMLDivElement>(null);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    if (window.innerWidth < 768) {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth < 768 && !isCollapsed && historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setIsCollapsed(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, setIsCollapsed]);

  const sidebarVariants: Variants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };
  
  const desktopSidebarVariants: Variants = {
    open: { width: '288px', transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { width: '0px', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  const itemVariants: Variants = {
    open: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
    closed: { opacity: 0, x: -20 },
  };

  const HistoryContent = () => (
    <div className="bg-surface/80 backdrop-blur-lg h-full flex flex-col shadow-lg md:rounded-r-2xl md:border-r md:border-white/10">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-primary">历史对话</h2>
        <button onClick={() => setIsCollapsed(true)} className="p-2 text-secondary hover:text-primary hover:bg-white/10 rounded-full transition-colors">
          <FiChevronsLeft size={20} />
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
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => handleStartEditing(e, conversation)} className="p-1 text-secondary hover:text-primary rounded-full">
                  <FiEdit size={14} />
                </button>
                <button onClick={(e) => handleDeleteConversation(e, conversation.id)} className="p-1 text-red-500 hover:text-red-400 rounded-full">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => { onNewChat(); if (window.innerWidth < 768) setIsCollapsed(true); }}
          className="w-full flex items-center justify-center gap-2 p-3 bg-accent/80 hover:bg-accent text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiPlus size={20} />
          <span>新对话</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              key="mobile-history-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setIsCollapsed(true)}
            />
          )}
        </AnimatePresence>
        <motion.div
          key="mobile-history-panel"
          ref={historyRef}
          variants={sidebarVariants}
          initial="closed"
          animate={isCollapsed ? 'closed' : 'open'}
          className="fixed top-0 left-0 h-full w-72 z-40"
        >
          <HistoryContent />
        </motion.div>
      </div>

      {/* Desktop */}
      <motion.div
        key="desktop-history-panel"
        variants={desktopSidebarVariants}
        initial="open"
        animate={isCollapsed ? 'closed' : 'open'}
        className="hidden md:block h-full"
      >
        <HistoryContent />
      </motion.div>
      {!isCollapsed && (
        <button onClick={() => setIsCollapsed(true)} className="hidden md:block p-2 text-secondary hover:text-primary hover:bg-white/10 rounded-full transition-colors absolute top-1/2 left-72 -translate-y-1/2 z-20">
          <FiChevronsLeft size={20} />
        </button>
      )}
      {isCollapsed && (
         <button onClick={() => setIsCollapsed(false)} className="hidden md:block p-2 text-secondary hover:text-primary hover:bg-white/10 rounded-full transition-colors absolute top-1/2 left-2 -translate-y-1/2 z-20">
          <FiChevronsRight size={20} />
        </button>
      )}
    </>
  );
};

export default History;