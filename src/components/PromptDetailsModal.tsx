import { Copy, Edit3, FlaskConical, Heart, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PromptTemplate } from '../types';
import { cn } from '../lib/utils';

interface PromptDetailsModalProps {
  prompt: PromptTemplate | null;
  isFavorite: boolean;
  onClose: () => void;
  onFavoriteToggle: () => void;
  onClone?: (prompt: PromptTemplate) => void;
  onEdit?: (prompt: PromptTemplate) => void;
  onTest?: (prompt: PromptTemplate) => void;
  currentUserId?: string | null;
}

function getSceneLabel(prompt: PromptTemplate) {
  if (prompt.scene === 'SRT') return 'SRT 分镜提示词';
  if (prompt.scene === 'Custom') return '全能参考分镜提示词';
  return 'AI通用对话提示词';
}

function ReadOnlyText({
  label,
  value,
  scrollable = false,
}: {
  label: string;
  value: string;
  scrollable?: boolean;
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div
        className={cn(
          'min-h-10 px-0 py-1 text-sm leading-relaxed text-zinc-200',
          scrollable && 'max-h-64 overflow-y-auto pr-3 details-scrollbar'
        )}
      >
        {value}
      </div>
    </section>
  );
}

export default function PromptDetailsModal({
  prompt,
  isFavorite,
  onClose,
  onFavoriteToggle,
  onClone,
  onEdit,
  onTest,
  currentUserId,
}: PromptDetailsModalProps) {
  if (!prompt) return null;

  const isOwner = !!currentUserId && prompt.authorId === currentUserId;
  const isOfficial = !!prompt.isOfficial;
  const canClone = !isOwner && !isOfficial && !!prompt.allowClone;
  const canViewPromptContent = isOwner || (!isOfficial && !!prompt.isPublic && !!prompt.allowClone);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative flex h-[72vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 p-5">
            <h2 className="text-base font-semibold">提示词详情</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-hidden p-5">
            <ReadOnlyText label="提示词名称" value={prompt.title || '未命名模板'} />
            <ReadOnlyText label="模板简介" value={prompt.description || '暂无简介'} />

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyText label="创建作者" value={prompt.authorName || '未知作者'} />
              <ReadOnlyText label="模板类别" value={getSceneLabel(prompt)} />
            </div>

            {canViewPromptContent && (
              <ReadOnlyText label="模板提示词" value={prompt.content || '暂无提示词正文'} scrollable />
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-zinc-800 p-4">
            {isOwner ? (
              <button
                type="button"
                onClick={() => onEdit?.(prompt)}
                className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                <Edit3 className="h-4 w-4" />
                编辑
              </button>
            ) : (
              <button
                type="button"
                onClick={onFavoriteToggle}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors',
                  isFavorite
                    ? 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300'
                    : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                )}
              >
                <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                收藏
              </button>
            )}

            {canClone && (
              <button
                type="button"
                onClick={() => onClone?.(prompt)}
                className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                <Copy className="h-4 w-4" />
                克隆
              </button>
            )}

            <button
              type="button"
              onClick={() => onTest?.(prompt)}
              className="flex h-10 items-center gap-2 rounded-lg border-none bg-gradient-to-r from-pink-500 to-purple-500 px-5 text-sm font-semibold text-white transition-transform active:scale-95"
            >
              <FlaskConical className="h-4 w-4" />
              测试
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
