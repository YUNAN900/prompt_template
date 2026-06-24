import { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  Clock, 
  Star,
  Globe,
  Lock,
  Wand2
} from 'lucide-react';
import { PromptTemplate, SceneType } from '../types';
import { cn } from '../lib/utils';
import PromptDetailsModal from '../components/PromptDetailsModal';
import PromptEditorModal from '../components/PromptEditorModal';
import { NEW_SEED_DATA } from '../lib/seeds';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'local_prompts';
const FAVORITES_KEY = 'local_favorites';

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

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

const OFFICIAL_SEEDS: PromptTemplate[] = NEW_SEED_DATA.map((s, i) => ({
  ...s,
  id: `seed-${i}`,
  authorName: 'PromptHero 官方',
  authorId: 'system',
  scene: (s.title.includes('SRT') || s.title.includes('分镜') || s.title.includes('提示词')) ? 'SRT' : 'Custom',
  usageCount: 1000 - i * 10,
  favoriteCount: 0,
  isPublic: true,
  allowClone: true,
  isOfficial: true,
}));

type TabType = 'official' | 'creations' | 'favorites';

export default function PromptSquare() {
  const [activeTab, setActiveTab] = useState<TabType>('official');
  const [myPrompts, setMyPrompts] = useState<PromptTemplate[]>(loadLocalPrompts);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScene, setSelectedScene] = useState<SceneType | 'All'>('All');
  const [sortBy, setSortBy] = useState<'recommend' | 'latest' | 'hottest'>('recommend');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Partial<PromptTemplate> | null>(null);

  // Derive displayed prompts
  let basePrompts: PromptTemplate[] = [];
  if (activeTab === 'official') {
    basePrompts = OFFICIAL_SEEDS;
  } else if (activeTab === 'creations') {
    basePrompts = myPrompts;
  } else {
    basePrompts = [...OFFICIAL_SEEDS, ...myPrompts].filter(p => favorites.includes(p.id));
  }

  if (selectedScene !== 'All') {
    basePrompts = basePrompts.filter(p => p.scene === selectedScene);
  }

  if (activeTab === 'official') {
    basePrompts = [...basePrompts].sort((a, b) => {
      if (sortBy === 'latest') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortBy === 'hottest') return (b.usageCount || 0) - (a.usageCount || 0);
      if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }

  const filteredPrompts = basePrompts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFavoriteToggle = (promptId: string) => {
    const isFav = favorites.includes(promptId);
    const next = isFav ? favorites.filter(id => id !== promptId) : [...favorites, promptId];
    setFavorites(next);
    saveFavorites(next);
  };

  const handleDelete = (id: string) => {
    const next = myPrompts.filter(p => p.id !== id);
    setMyPrompts(next);
    saveLocalPrompts(next);
    setSelectedPrompt(null);
  };

  const handleSave = (data: Partial<PromptTemplate>) => {
    if (editingPrompt?.id) {
      const next = myPrompts.map(p =>
        p.id === editingPrompt.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      );
      setMyPrompts(next);
      saveLocalPrompts(next);
    } else {
      const newPrompt: PromptTemplate = {
        id: `local-${Date.now()}`,
        authorName: '我',
        authorId: 'local',
        usageCount: 0,
        favoriteCount: 0,
        isOfficial: false,
        allowClone: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(data as PromptTemplate),
      };
      const next = [newPrompt, ...myPrompts];
      setMyPrompts(next);
      saveLocalPrompts(next);
      setActiveTab('creations');
    }
    setIsEditorOpen(false);
    setEditingPrompt(null);
  };

  const sortOptions = [
    { id: 'recommend', name: '推荐', icon: Star },
    { id: 'latest', name: '最新', icon: Clock },
    { id: 'hottest', name: '最热', icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-white" />
          <h1 className="text-xl font-bold">提示词库</h1>
        </div>
        <button
          onClick={() => { setEditingPrompt(null); setIsEditorOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold transition-colors shadow-sm text-sm"
        >
          创建提示词模板
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('official')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-bold transition-all",
            activeTab === 'official'
              ? "bg-pink-500 text-white"
              : "bg-[#2A2A2A] text-white/60 hover:bg-[#3A3A3A] hover:text-white"
          )}
        >
          官方推荐
        </button>
        <button
          onClick={() => setActiveTab('creations')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-bold transition-all",
            activeTab === 'creations'
              ? "bg-pink-500 text-white"
              : "bg-[#2A2A2A] text-white/60 hover:bg-[#3A3A3A] hover:text-white"
          )}
        >
          我的创建
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-bold transition-all",
            activeTab === 'favorites'
              ? "bg-pink-500 text-white"
              : "bg-[#2A2A2A] text-white/60 hover:bg-[#3A3A3A] hover:text-white"
          )}
        >
          我的收藏 ({favorites.length})
        </button>
      </div>

      {/* Sort (official tab only) */}
      {activeTab === 'official' && (
        <div className="flex gap-2">
          {sortOptions.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id as typeof sortBy)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  sortBy === opt.id
                    ? "bg-pink-500 text-white"
                    : "bg-[#2A2A2A] text-white/40 hover:bg-[#3A3A3A] hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {opt.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="搜索提示词..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-11 pr-4 bg-[#2A2A2A] border border-white/5 rounded-2xl outline-none focus:border-pink-500/20 transition-all text-sm text-white placeholder:text-white/20"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {activeTab === 'creations' ? (
            filteredPrompts.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#2A2A2A] text-white rounded-2xl p-5 border border-[#ffffff]/10 shadow-sm flex flex-col cursor-pointer hover:border-pink-500/50 transition-colors"
                onClick={() => setSelectedPrompt(p)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300">
                    {p.scene === 'SRT' ? 'SRT模式' : '自定义模式'}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isPublic ? (
                      <Globe className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-white/20" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(p.id); }}
                      className="text-white/40 hover:text-yellow-400 transition-colors"
                    >
                      <Star className={cn("w-4 h-4", favorites.includes(p.id) && "fill-yellow-400 text-yellow-400")} />
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-bold mb-1 truncate">{p.title}</h3>
                <p className="text-xs text-white/50 line-clamp-1 mb-4 flex-1">{p.description || '暂无简介'}</p>
                <div className="flex items-center justify-between text-[11px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center font-bold text-[8px]">
                      {p.authorName?.[0] || '我'}
                    </div>
                    {p.authorName || '我'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingPrompt(p); setIsEditorOpen(true); }}
                      className="hover:text-white transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="hover:text-red-400 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            filteredPrompts.map((prompt) => (
              <motion.div
                key={prompt.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#2A2A2A] text-white rounded-2xl p-5 border border-[#ffffff]/10 shadow-sm flex flex-col cursor-pointer hover:border-pink-500/50 transition-colors"
                onClick={() => setSelectedPrompt(prompt)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300">
                    {prompt.scene === 'SRT' ? 'SRT模式' : '自定义模式'}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(prompt.id); }}
                    className="text-white/40 hover:text-yellow-400 transition-colors"
                  >
                    <Star className={cn("w-4 h-4", favorites.includes(prompt.id) && "fill-yellow-400 text-yellow-400")} />
                  </button>
                </div>
                <h3 className="text-base font-bold mb-1 truncate">{prompt.title}</h3>
                <p className="text-xs text-white/50 line-clamp-1 mb-4 flex-1">{prompt.description || '暂无简介'}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center font-bold text-[8px]">
                    {prompt.authorName?.[0] || '方'}
                  </div>
                  {prompt.authorName || '剧梦官方'}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* No results */}
      {filteredPrompts.length === 0 && (
        <div className="text-center py-20 bg-[#2A2A2A] rounded-[32px] border border-dashed border-white/10 flex flex-col items-center gap-4">
          <p className="text-white/40 font-medium whitespace-pre-line">
            没找到相关的提示词
          </p>
        </div>
      )}

      {/* Details Modal */}
      <PromptDetailsModal
        prompt={selectedPrompt}
        isFavorite={selectedPrompt ? favorites.includes(selectedPrompt.id) : false}
        onClose={() => setSelectedPrompt(null)}
        onFavoriteToggle={() => selectedPrompt && handleFavoriteToggle(selectedPrompt.id)}
        onDelete={handleDelete}
        currentUserId="local"
      />

      {/* Editor Modal */}
      <PromptEditorModal
        isOpen={isEditorOpen}
        prompt={editingPrompt}
        onClose={() => { setIsEditorOpen(false); setEditingPrompt(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
