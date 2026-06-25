import { useMemo, useState } from 'react';
import { FileText, Info, Search, ShieldCheck } from 'lucide-react';
import { PromptTemplate, SceneType } from '../types';
import { cn } from '../lib/utils';

const STORAGE_KEY = 'local_prompts';
const SITE_MESSAGES_KEY = 'local_site_messages';

type PublicFilter = 'All' | 'Public' | 'Private';

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

function appendSiteMessage(prompt: PromptTemplate) {
  const message = {
    id: `msg-${Date.now()}`,
    promptId: prompt.id,
    promptTitle: prompt.title,
    toUserId: prompt.authorId,
    toUserName: prompt.authorName,
    content: '当前模板暂被官方下架，请修改后重新公开；',
    createdAt: new Date().toISOString(),
    read: false,
  };

  try {
    const raw = localStorage.getItem(SITE_MESSAGES_KEY);
    const messages = raw ? JSON.parse(raw) : [];
    localStorage.setItem(SITE_MESSAGES_KEY, JSON.stringify([message, ...messages]));
  } catch {
    localStorage.setItem(SITE_MESSAGES_KEY, JSON.stringify([message]));
  }
}

function getSceneLabel(scene: SceneType) {
  if (scene === 'SRT') return 'SRT分镜提示词';
  if (scene === 'Custom') return '全能参考分镜提示词';
  return 'Agent对话';
}

function getReferenceUserCount(prompt: PromptTemplate) {
  const extended = prompt as PromptTemplate & { referenceUserCount?: number };
  if (typeof extended.referenceUserCount === 'number') return extended.referenceUserCount;
  return Math.min(prompt.usageCount || 0, Math.max(1, Math.ceil((prompt.usageCount || 0) / 3)));
}

export default function PromptAdmin() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>(loadLocalPrompts);
  const [sceneFilter, setSceneFilter] = useState<SceneType | 'All'>('All');
  const [publicFilter, setPublicFilter] = useState<PublicFilter>('All');
  const [query, setQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);

  const filteredPrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return prompts.filter(prompt => {
      const matchScene = sceneFilter === 'All' || prompt.scene === sceneFilter;
      const matchPublic =
        publicFilter === 'All' ||
        (publicFilter === 'Public' ? prompt.isPublic : !prompt.isPublic);
      const matchKeyword =
        !keyword ||
        prompt.title.toLowerCase().includes(keyword) ||
        prompt.authorName.toLowerCase().includes(keyword);

      return matchScene && matchPublic && matchKeyword;
    });
  }, [prompts, publicFilter, query, sceneFilter]);

  const handleTakeDown = (prompt: PromptTemplate) => {
    const next = prompts.map(item =>
      item.id === prompt.id
        ? { ...item, isPublic: false, allowClone: false, updatedAt: new Date().toISOString() }
        : item
    );
    setPrompts(next);
    saveLocalPrompts(next);
    appendSiteMessage(prompt);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-pink-300">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">管理后台</span>
          </div>
          <h1 className="text-2xl font-bold text-white">提示词库管理</h1>
          <p className="mt-1 text-sm text-white/45">查看和处理所有自定义创建的提示词模板</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#242424] px-4 py-3 text-right">
          <p className="text-[11px] text-white/40">自定义模板</p>
          <p className="text-xl font-bold text-white">{prompts.length}</p>
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-[#242424] p-4 md:grid-cols-[180px_180px_1fr]">
        <select
          value={sceneFilter}
          onChange={event => setSceneFilter(event.target.value as SceneType | 'All')}
          className="h-10 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 text-sm text-white outline-none focus:border-pink-500/60"
        >
          <option value="All">全部类别</option>
          <option value="SRT">SRT分镜提示词</option>
          <option value="Custom">全能参考分镜提示词</option>
          <option value="Agent">Agent对话</option>
        </select>

        <select
          value={publicFilter}
          onChange={event => setPublicFilter(event.target.value as PublicFilter)}
          className="h-10 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 text-sm text-white outline-none focus:border-pink-500/60"
        >
          <option value="All">全部公开状态</option>
          <option value="Public">已公开</option>
          <option value="Private">未公开</option>
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索创建人名称 / 提示词模板名称"
            className="h-10 w-full rounded-lg border border-white/10 bg-[#1A1A1A] pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-pink-500/60"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#242424]">
        <div className="grid grid-cols-[1.4fr_150px_110px_120px_150px_90px_90px] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold text-white/40">
          <span>模板名称</span>
          <span>模板类别</span>
          <span>公开状态</span>
          <span>创建人</span>
          <span className="text-right">操作</span>
          <span className="text-right">调用次数</span>
          <span className="text-right">调用人数</span>
        </div>

        {filteredPrompts.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/40">暂无符合条件的自定义模板</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredPrompts.map(prompt => (
              <div
                key={prompt.id}
                className="grid grid-cols-[1.4fr_150px_110px_120px_150px_90px_90px] items-center gap-3 px-4 py-4 text-sm text-white"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{prompt.title}</p>
                  <p className="mt-1 truncate text-xs text-white/35">{prompt.description || '暂无简介'}</p>
                </div>
                <span className="text-xs text-white/55">{getSceneLabel(prompt.scene)}</span>
                <span
                  className={cn(
                    'w-fit rounded-full px-2 py-1 text-xs',
                    prompt.isPublic ? 'bg-green-500/15 text-green-300' : 'bg-zinc-700 text-zinc-300'
                  )}
                >
                  {prompt.isPublic ? '已公开' : '未公开'}
                </span>
                <span className="truncate text-white/55">{prompt.authorName}</span>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleTakeDown(prompt)}
                    disabled={!prompt.isPublic}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                      prompt.isPublic
                        ? 'border-red-500/30 text-red-300 hover:bg-red-500/10'
                        : 'cursor-not-allowed border-white/5 text-white/20'
                    )}
                  >
                    下架
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPrompt(prompt)}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    查看信息
                  </button>
                </div>
                <span className="text-right text-xs text-white/55">{prompt.usageCount || 0}</span>
                <span className="text-right text-xs text-white/55">{getReferenceUserCount(prompt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-2xl">
            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 p-5">
              <Info className="h-5 w-5 text-pink-300" />
              <h2 className="text-base font-semibold">提示词信息</h2>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <InfoRow label="模板名称" value={selectedPrompt.title} />
              <InfoRow label="简介" value={selectedPrompt.description || '暂无简介'} />
              <InfoRow label="模板类别" value={getSceneLabel(selectedPrompt.scene)} />

              <section>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <FileText className="h-4 w-4" />
                  提示词正文
                </div>
                <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-200">
                  {selectedPrompt.content}
                </pre>
              </section>
            </div>

            <div className="shrink-0 border-t border-zinc-800 p-4">
              <button
                type="button"
                onClick={() => setSelectedPrompt(null)}
                className="h-10 w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-sm font-semibold text-white"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/70 px-3 py-2">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{value}</p>
    </div>
  );
}
