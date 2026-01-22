'use client';

import { Message } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface MessageEditModalProps {
  message: Message | null;
  onSave: (messageId: string, newContent: string) => void;
  onClose: () => void;
}

export default function MessageEditModal({ message, onSave, onClose }: MessageEditModalProps) {
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    if (message) {
      setEditedContent(message.content);
    }
  }, [message]);

  if (!message) {
    return null;
  }

  const handleSave = () => {
    onSave(message.id, editedContent);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4 text-primary">编辑消息</h2>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-2 rounded-md bg-surface-variant text-primary border border-primary/20 focus:outline-none focus:ring-2 focus:ring-accent"
            rows={10}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-md text-sm bg-gray-600 hover:bg-gray-500 text-white">
              取消
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded-md text-sm bg-accent hover:bg-accent-dark text-white">
              保存
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}