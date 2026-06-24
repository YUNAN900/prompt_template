import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { PromptTemplate } from '../types';
import { 
  Search, 
  X, 
  Zap,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NEW_SEED_DATA } from '../lib/seeds';

const STORAGE_KEY = 'local_prompts';

function loadLocalPrompts(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPrompts(prompts: PromptTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

const OFFICIAL_SEEDS: PromptTemplate[] = NEW_SEED_DATA.map((s, i) => ({
  ...s,
  id: `seed-${i}`,
  authorName: 'PromptHero 官方',
  authorId: 'system',
  scene: 'SRT' as const,
  usageCount: 1000 - i * 10,
  favoriteCount: 0,
  isPublic: true,
  isOfficial: true,
}));

interface SRTReferenceModalProps {
  isOpen: boolean;
  onSelect: (p: PromptTemplate) => void;
  onClose: () => void;
  currentSelectedId?: string;
}

export default function SRTReferenceModal({ isOpen, onSelect, onClose, currentSelectedId }: SRTReferenceModalProps) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      const local = loadLocalPrompts().filter(p => p.scene === 'SRT');
      const combined = [...OFFICIAL_SEEDS, ...local.filter(l => !OFFICIAL_SEEDS.some(o => o.id === l.id))];
      setPrompts(combined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = prompts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const officialPrompts = filtered.filter(p => p.isOfficial);
  const myPrompts = filtered.filter(p => !p.isOfficial);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedLocal = loadLocalPrompts().filter(p => p.id !== id);
    saveLocalPrompts(updatedLocal);
    setPrompts(prev => prev.filter(p => p.id !== id));
  };

  const renderGroup = (title: string, items: PromptTemplate[], colorClass: string) => {
    if (items.length === 0 && searchQuery) return null;
    return (
      <div className="space-y-4">
        <h3 className={cn("text-lg font-bold flex items-center gap-2", colorClass)}>
          {title}
        </h3>
        <div className="flex flex-wrap gap-3">
          {items.map(p => (
            <div key={p.id} className="group relative">
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(p)}
                className={cn(
                  "px-5 py-3 rounded-2xl border-2 transition-all font-bold text-sm h-full",
                  currentSelectedId === p.id
                    ? "bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/20"
                    : "bg-[#2A2A2A] border-white/5 text-white/60 hover:border-pink-500/30 hover:text-pink-400"
                )}
              >
                {p.title}
              </motion.button>

              {!p.isOfficial && (
                <button
                  onClick={(e) => handleDelete(e, p.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-[#1A1A1A] text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-red-500/20 shadow-md hover:bg-red-500/10 z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {items.length === 0 && !searchQuery && (
            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest py-2">暂无数据</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-[#1A1A1A] w-full max-w-3xl max-h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-white/10 text-white"
        >
          {/* Header */}
          <div className="p-8 bg-[#1A1A1A] border-b border-white/5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                  <Zap className="w-6 h-6 text-pink-500 fill-current" />
                  引用提示词模板
                </h2>
                <p className="text-sm text-white/40 mt-1">点击标签即刻应用该提示词逻辑</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                <X className="w-6 h-6 text-white/40" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-8 py-4 bg-[#2A2A2A] border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="极速搜索模板名称..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-[#1A1A1A] border border-white/5 rounded-2xl outline-none focus:bg-[#3A3A3A] focus:border-pink-500/20 transition-all text-sm font-medium text-white placeholder:text-white/20"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 no-scrollbar pb-32 bg-[#1A1A1A]">
            <div className="space-y-12">
              {renderGroup("官方推荐", officialPrompts, "text-amber-400")}
              {renderGroup("我创建的", myPrompts, "text-blue-400")}
            </div>
          </div>

          {/* Footer Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1A1A1A] to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
