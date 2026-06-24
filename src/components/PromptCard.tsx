import * as React from 'react';
import { useState } from 'react';
import { 
  Heart, 
  Copy, 
  User, 
  Zap, 
  Check, 
  ArrowUpRight 
} from 'lucide-react';
import { PromptTemplate } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PromptCardProps {
  prompt: PromptTemplate;
  isFavorite: boolean;
  onFavoriteToggle: () => void | Promise<void>;
  onCardClick: () => void;
  key?: React.Key;
}

export default function PromptCard({ prompt, isFavorite, onFavoriteToggle, onCardClick }: PromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle();
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={onCardClick}
      className="bg-white rounded-2xl p-6 border border-[#1A1A1A]/5 shadow-sm hover:shadow-xl hover:shadow-[#5A5A40]/5 transition-all cursor-pointer group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider",
          prompt.scene === 'SRT' ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
        )}>
          {prompt.scene === 'SRT' ? 'SRT 分镜' : '自定义'}
        </div>
        <button 
          onClick={handleFavorite}
          className={cn(
            "p-2 rounded-full transition-colors",
            isFavorite ? "bg-red-50 text-red-500" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/40 hover:bg-red-50 hover:text-red-500"
          )}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
      </div>

      <h3 className="text-lg font-bold mb-2 line-clamp-1 group-hover:text-[#5A5A40] transition-colors">
        {prompt.title}
      </h3>
      
      <p className="text-sm text-[#1A1A1A]/60 line-clamp-2 mb-4 grow italic">
        {prompt.description}
      </p>

      <div className="space-y-4 mt-auto">
        <div className="flex items-center justify-between text-[11px] text-[#1A1A1A]/40 border-t border-[#1A1A1A]/5 pt-4">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span>{prompt.authorName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> {prompt.usageCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" /> {prompt.favoriteCount}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F5F5F0] text-[#5A5A40] text-xs font-semibold hover:bg-[#5A5A40] hover:text-white transition-all overflow-hidden relative"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span 
                  key="check" 
                  initial={{ y: 20 }} 
                  animate={{ y: 0 }} 
                  exit={{ y: -20 }}
                  className="flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> 已复制
                </motion.span>
              ) : (
                <motion.span 
                  key="copy" 
                  initial={{ y: 20 }} 
                  animate={{ y: 0 }} 
                  exit={{ y: -20 }}
                  className="flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> 复制内容
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button className="p-2.5 rounded-xl border border-[#1A1A1A]/5 text-[#1A1A1A]/40 hover:text-[#5A5A40] hover:border-[#5A5A40]/30 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
