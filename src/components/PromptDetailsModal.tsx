import { PromptTemplate } from '../types';
import { X, Copy, Check, Heart, User, Calendar, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { cn } from '../lib/utils';
interface PromptDetailsModalProps {
  prompt: PromptTemplate | null;
  isFavorite: boolean;
  onClose: () => void;
  onFavoriteToggle: () => void;
  onDelete?: (id: string) => void;
  currentUserId?: string | null;
}

export default function PromptDetailsModal({ 
  prompt, 
  isFavorite, 
  onClose, 
  onFavoriteToggle,
  onDelete,
  currentUserId
}: PromptDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!prompt) return null;

  const isOwner = currentUserId && prompt.authorId === currentUserId;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#1A1A1A] text-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  prompt.scene === 'SRT' ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
                )}>
                  {prompt.scene === 'SRT' ? 'SRT 分镜' : '自定义'}
                </span>
                {prompt.isOfficial && (
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-bold uppercase tracking-wider">
                    官方推荐
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold">{prompt.title}</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/40"
            >
              <X className="w-6 h-6 text-white/40" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#1a1a1a]">
            <div className="mb-8">
              <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">Prompt 内容</h4>
              <div className="bg-[#2A2A2A] border border-white/5 rounded-2xl p-6 relative group overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-6 bg-white/5 flex items-center px-4 gap-1 border-b border-white/5">
                   <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                   <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <pre className="mt-4 text-sm font-mono whitespace-pre-wrap text-white/80 leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                  {prompt.content}
                </pre>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={handleCopy}
                    className="p-2 bg-[#1A1A1A] rounded-lg shadow-sm hover:shadow-md transition-shadow text-white hover:text-pink-400"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#2A2A2A] border border-white/5 flex items-center gap-3">
                <User className="w-8 h-8 p-1.5 bg-[#1A1A1A] text-white/60 rounded-full" />
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">作者</p>
                  <p className="text-sm font-semibold">{prompt.authorName}</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#2A2A2A] border border-white/5 flex items-center gap-3">
                <Calendar className="w-8 h-8 p-1.5 bg-[#1A1A1A] text-white/60 rounded-full" />
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">创建时间</p>
                  <p className="text-sm font-semibold">
                    {prompt.createdAt ? new Date(prompt.createdAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">简介</h4>
              <p className="text-sm text-white/60 italic leading-relaxed">
                {prompt.description || '暂无描述'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-[#1A1A1A] flex gap-3">
            {isOwner && onDelete && (
              <button 
                onClick={() => {
                  if (window.confirm('确定要删除这个模板吗？')) {
                    onDelete(prompt.id);
                  }
                }}
                className="w-12 h-12 flex items-center justify-center rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all active:scale-95"
                title="删除模板"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={handleCopy}
              className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-pink-500 text-white font-bold hover:shadow-lg hover:shadow-pink-500/30 transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" /> 已复制内容
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" /> 一键复制 Prompt
                </>
              )}
            </button>
            <button 
              onClick={onFavoriteToggle}
              className={cn(
                "w-12 h-12 flex items-center justify-center rounded-2xl border transition-all active:scale-95",
                isFavorite 
                  ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-500" 
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-yellow-500/10 hover:border-yellow-500/20 hover:text-yellow-400"
              )}
            >
              <Heart className={cn("w-6 h-6", isFavorite && "fill-current")} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
