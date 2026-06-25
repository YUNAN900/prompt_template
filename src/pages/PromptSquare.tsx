import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Heart, Lock, Search, TrendingUp, Wand2, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PromptTemplate, SceneType } from '../types';
import { cn } from '../lib/utils';
import PromptDetailsModal from '../components/PromptDetailsModal';
import PromptEditorModal from '../components/PromptEditorModal';
import { NEW_SEED_DATA } from '../lib/seeds';

const STORAGE_KEY = 'local_prompts';
const FAVORITES_KEY = 'local_favorites';
const DEBUG_RETURN_KEY = 'debug_return_context';

type TabType = 'square' | 'creations' | 'favorites';
type SortType = 'latest' | 'hottest';

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

function sceneLabel(scene: SceneType) {
  if (scene === 'SRT') return 'SRT 分镜提示词';
  if (scene === 'Custom') return '全能参考分镜提示词';
  return 'AI通用对话提示词';
}

function sceneBadgeClass(scene: SceneType) {
  if (scene === 'SRT') return 'bg-amber-500/15 text-amber-300';
  if (scene === 'Custom') return 'bg-blue-500/15 text-blue-300';
  return 'bg-purple-500/15 text-purple-300';
}

function getFavoriteCount(prompt: PromptTemplate, favorites: string[]) {
  return (prompt.favoriteCount || 0) + (favorites.includes(prompt.id) ? 1 : 0);
}

function getCreatedTime(prompt: PromptTemplate) {
  return prompt.createdAt ? new Date(prompt.createdAt).getTime() : 0;
}

const OFFICIAL_SEEDS: PromptTemplate[] = NEW_SEED_DATA.map((seed, index) => ({
  ...seed,
  id: `seed-${index}`,
  authorName: 'PromptHero 官方',
  authorId: 'system',
  scene: seed.title.includes('SRT') || seed.title.includes('分镜') ? 'SRT' : 'Custom',
  usageCount: 1000 - index * 10,
  favoriteCount: 0,
  isPublic: true,
  allowClone: true,
  isOfficial: true,
  createdAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
}));

export default function PromptSquare() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('square');
  const [myPrompts, setMyPrompts] = useState<PromptTemplate[]>(loadLocalPrompts);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScene, setSelectedScene] = useState<SceneType | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortType>('latest');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Partial<PromptTemplate> | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(DEBUG_RETURN_KEY);
    if (!raw) return;

    try {
      const context = JSON.parse(raw) as {
        type?: 'editor' | 'preview';
        promptId?: string;
        prompt?: Partial<PromptTemplate>;
        activeTab?: TabType;
      };
      sessionStorage.removeItem(DEBUG_RETURN_KEY);

      if (context.type === 'editor') {
        setEditingPrompt(context.prompt || null);
        setIsEditorOpen(true);
        return;
      }

      if (context.type === 'preview') {
        if (context.activeTab) setActiveTab(context.activeTab);
        const allPrompts = [...OFFICIAL_SEEDS, ...loadLocalPrompts()];
        const matchedPrompt = allPrompts.find(prompt => prompt.id === context.promptId) || context.prompt;
        if (matchedPrompt) setSelectedPrompt(matchedPrompt as PromptTemplate);
      }
    } catch {
      sessionStorage.removeItem(DEBUG_RETURN_KEY);
    }
  }, []);

  const squarePrompts = [...OFFICIAL_SEEDS, ...myPrompts.filter(prompt => prompt.isPublic)];

  let basePrompts: PromptTemplate[] = [];
  if (activeTab === 'square') {
    basePrompts = squarePrompts;
  } else if (activeTab === 'creations') {
    basePrompts = myPrompts;
  } else {
    basePrompts = [...OFFICIAL_SEEDS, ...myPrompts].filter(prompt => favorites.includes(prompt.id));
  }

  const filteredPrompts = basePrompts
    .filter(prompt => selectedScene === 'All' || prompt.scene === selectedScene)
    .filter(prompt => prompt.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'hottest') return (b.usageCount || 0) - (a.usageCount || 0);
      return getCreatedTime(b) - getCreatedTime(a);
    });

  const handleFavoriteToggle = (promptId: string) => {
    const isFavorite = favorites.includes(promptId);
    const next = isFavorite ? favorites.filter(id => id !== promptId) : [...favorites, promptId];
    setFavorites(next);
    saveFavorites(next);
  };

  const handleDelete = (id: string) => {
    const next = myPrompts.filter(prompt => prompt.id !== id);
    setMyPrompts(next);
    saveLocalPrompts(next);
    setSelectedPrompt(null);
  };

  const handleClone = (prompt: PromptTemplate) => {
    const clonedPrompt: PromptTemplate = {
      ...prompt,
      id: `local-${Date.now()}`,
      title: `${prompt.title} 副本`.slice(0, 50),
      authorName: '我',
      authorId: 'local',
      usageCount: 0,
      favoriteCount: 0,
      isOfficial: false,
      isPublic: false,
      allowClone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [clonedPrompt, ...myPrompts];
    setMyPrompts(next);
    saveLocalPrompts(next);
    setActiveTab('creations');
    setSelectedPrompt(clonedPrompt);
  };

  const handleEditFromPreview = (prompt: PromptTemplate) => {
    setSelectedPrompt(null);
    setEditingPrompt(prompt);
    setIsEditorOpen(true);
  };

  const handleTest = (prompt: PromptTemplate) => {
    sessionStorage.setItem('debug_template', JSON.stringify(prompt));
    sessionStorage.setItem(
      DEBUG_RETURN_KEY,
      JSON.stringify({
        type: 'preview',
        promptId: prompt.id,
        prompt,
        activeTab,
      })
    );
    setSelectedPrompt(null);
    navigate('/debug');
  };

  const handleSave = (data: Partial<PromptTemplate>) => {
    if (editingPrompt?.id) {
      const next = myPrompts.map(prompt =>
        prompt.id === editingPrompt.id ? { ...prompt, ...data, updatedAt: new Date().toISOString() } : prompt
      );
      setMyPrompts(next);
      saveLocalPrompts(next);
    } else {
      const newPrompt: PromptTemplate = {
        id: `local-${Date.now()}`,
        title: data.title || '未命名模板',
        description: data.description || '',
        content: data.content || '',
        scene: (data.scene || 'SRT') as SceneType,
        authorName: '我',
        authorId: 'local',
        usageCount: 0,
        favoriteCount: 0,
        isPublic: data.isPublic ?? false,
        allowClone: data.allowClone ?? false,
        isOfficial: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [newPrompt, ...myPrompts];
      setMyPrompts(next);
      saveLocalPrompts(next);
      setActiveTab('creations');
    }

    setIsEditorOpen(false);
    setEditingPrompt(null);
  };

  const tabs = [
    { id: 'square', label: '提示词广场' },
    { id: 'creations', label: '我的创建' },
    { id: 'favorites', label: `我的收藏 (${favorites.length})` },
  ] satisfies { id: TabType; label: string }[];

  const sceneOptions = [
    { id: 'All', label: '全部类型' },
    { id: 'SRT', label: 'SRT 分镜提示词' },
    { id: 'Custom', label: '全能参考分镜提示词' },
    { id: 'Agent', label: 'AI通用对话提示词' },
  ] satisfies { id: SceneType | 'All'; label: string }[];

  const sortOptions = [
    { id: 'latest', label: '最新', icon: Clock },
    { id: 'hottest', label: '最热', icon: TrendingUp },
  ] satisfies { id: SortType; label: string; icon: typeof Clock }[];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-white" />
          <h1 className="text-xl font-bold">提示词库</h1>
        </div>
        <button
          onClick={() => {
            setEditingPrompt(null);
            setIsEditorOpen(true);
          }}
          className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-pink-600"
        >
          创建提示词模板
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-bold transition-all',
              activeTab === tab.id ? 'bg-pink-500 text-white' : 'bg-[#2A2A2A] text-white/60 hover:bg-[#3A3A3A] hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-[#242424] p-4 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            placeholder="按名称搜索提示词模板"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/5 bg-[#1A1A1A] pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-pink-500/30"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {sceneOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setSelectedScene(option.id)}
              className={cn(
                'h-11 rounded-xl px-3 text-xs font-bold transition-all',
                selectedScene === option.id ? 'bg-pink-500 text-white' : 'bg-[#1A1A1A] text-white/45 hover:text-white'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {sortOptions.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={cn(
                  'flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all',
                  sortBy === option.id ? 'bg-pink-500 text-white' : 'bg-[#1A1A1A] text-white/45 hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredPrompts.map(prompt => (
            <motion.div
              key={prompt.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex cursor-pointer flex-col rounded-2xl border border-white/10 bg-[#2A2A2A] p-5 text-white shadow-sm transition-colors hover:border-pink-500/50"
              onClick={() => setSelectedPrompt(prompt)}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className={cn('rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', sceneBadgeClass(prompt.scene))}>
                  {sceneLabel(prompt.scene)}
                </div>
                <div className="flex items-center gap-2">
                  {activeTab !== 'square' && !prompt.isOfficial && !prompt.isPublic && (
                    <Lock className="h-3.5 w-3.5 text-white/20" />
                  )}
                </div>
              </div>

              <h3 className="mb-1 truncate text-base font-bold">{prompt.title}</h3>
              <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-white/50">
                {prompt.description || '暂无简介'}
              </p>

              {activeTab !== 'creations' && (
                <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3 text-[11px] text-zinc-500">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold">
                      {prompt.authorName?.[0] || 'P'}
                    </div>
                    <span className="truncate">{prompt.authorName || 'PromptHero'}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      {prompt.usageCount || 0}
                    </span>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        handleFavoriteToggle(prompt.id);
                      }}
                      className="flex items-center gap-1 transition-colors hover:text-zinc-300"
                      aria-label="收藏"
                    >
                      <Heart className={cn('h-3.5 w-3.5', favorites.includes(prompt.id) && 'fill-current')} />
                      {getFavoriteCount(prompt, favorites)}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'creations' && (
                <div className="mt-3 flex justify-end gap-3 border-t border-white/5 pt-3 text-xs text-white/45">
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      setEditingPrompt(prompt);
                      setIsEditorOpen(true);
                    }}
                    className="transition-colors hover:text-white"
                  >
                    编辑
                  </button>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      handleDelete(prompt.id);
                    }}
                    className="transition-colors hover:text-red-400"
                  >
                    删除
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPrompts.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-[32px] border border-dashed border-white/10 bg-[#2A2A2A] py-20 text-center">
          <p className="font-medium text-white/40">没找到相关的提示词模板</p>
        </div>
      )}

      <PromptDetailsModal
        prompt={selectedPrompt}
        isFavorite={selectedPrompt ? favorites.includes(selectedPrompt.id) : false}
        onClose={() => setSelectedPrompt(null)}
        onFavoriteToggle={() => selectedPrompt && handleFavoriteToggle(selectedPrompt.id)}
        onClone={handleClone}
        onEdit={handleEditFromPreview}
        onTest={handleTest}
        currentUserId="local"
      />

      <PromptEditorModal
        isOpen={isEditorOpen}
        prompt={editingPrompt}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingPrompt(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
