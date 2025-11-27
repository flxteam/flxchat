import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ThinkingProps {
  thinking: string;
}

const Thinking = ({ thinking }: ThinkingProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-2 p-2 bg-gray-800 bg-opacity-50 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
      >
        {isExpanded ? <FiChevronDown className="mr-2" /> : <FiChevronRight className="mr-2" />}
        深度思考
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pl-6 text-xs text-gray-400 overflow-hidden"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thinking}
            </ReactMarkdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Thinking;