import { useState, useEffect } from 'react';
import { PromptTemplate } from '../types';
import { cn } from '../lib/utils';
import { 
  Search, 
  Check, 
  ExternalLink,
  Layers,
  Star as StarIcon,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
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

export default function SRTIntegration() {
  const [activeTab, setActiveTab] = useState('官方推荐');
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tabs = ['官方推荐', '我的模板'];

  useEffect(() => {
    if (activeTab === '官方推荐') {
      setPrompts(OFFICIAL_SEEDS.filter(p => p.scene === 'SRT'));
    } else {
      const local = loadLocalPrompts().filter(p => p.scene === 'SRT');
      setPrompts(local);
    }
  }, [activeTab]);

  const handleSelect = (p: PromptTemplate) => {
    setSelectedId(p.id);
    navigator.clipboard.writeText(p.content);
  };

  const filtered = prompts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="bg-[#F5F5F0] min-h-screen flex flex-col font-serif">
      {/* Header */}
      <div className="bg-white p-6 border-b border-[#1A1A1A]/10">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#5A5A40] fill-current" />
          选择分镜提示词模板
        </h2>
        <p className="text-sm text-[#1A1A1A]/40 mt-1">选择最适合当前分镜的一组逻辑指令</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white px-6 gap-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "py-4 text-sm font-bold transition-all border-b-2",
              activeTab === tab ? "text-[#5A5A40] border-[#5A5A40]" : "text-[#1A1A1A]/20 border-transparent hover:text-[#1A1A1A]/40"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/20" />
          <input
            type="text"
            placeholder="在选定分类下搜索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-[#1A1A1A]/10 rounded-xl outline-none focus:border-[#5A5A40]/30 transition-all text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[#1A1A1A]/20">
            <Layers className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs">该分类下暂无匹配模板</p>
          </div>
        ) : (
          filtered.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleSelect(p)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer group flex items-start gap-4",
                selectedId === p.id
                  ? "bg-white border-[#5A5A40] shadow-xl shadow-[#5A5A40]/10"
                  : "bg-white border-[#1A1A1A]/5 hover:border-[#5A5A40]/30"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                selectedId === p.id ? "bg-[#5A5A40] text-white" : "bg-[#F5F5F0] text-[#1A1A1A]/20 group-hover:bg-[#5A5A40]/10 group-hover:text-[#5A5A40]"
              )}>
                {selectedId === p.id ? <Check className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold truncate">{p.title}</h4>
                <p className="text-xs text-[#1A1A1A]/40 line-clamp-1 mt-0.5 italic">{p.description || p.content}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      {selectedId && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#1A1A1A]/10 animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => alert(`已选择并复制模板: ${prompts.find(p => p.id === selectedId)?.title}`)}
            className="w-full h-12 bg-[#5A5A40] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#5A5A40]/20 active:scale-95 transition-transform"
          >
            应用此模板到编辑器
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
