import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import { FlaskConical, Info, Save, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PromptTemplate, SceneType } from '../types';
import { cn } from '../lib/utils';

interface PromptEditorModalProps {
  prompt: Partial<PromptTemplate> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PromptTemplate>) => void;
}

const MAX_TITLE = 50;
const MAX_DESCRIPTION = 500;
const MAX_CONTENT = 4000;
const DEBUG_RETURN_KEY = 'debug_return_context';

const SCENE_OPTIONS: { value: SceneType; label: string }[] = [
  { value: 'SRT', label: 'SRT分镜提示词' },
  { value: 'Custom', label: '全能参考分镜提示词' },
  { value: 'Agent', label: 'AI通用对话' },
];

const FIXED_PARAMS: Record<SceneType, string[]> = {
  SRT: ['当前分镜内容', '小说原文', '人物场景道具列表'],
  Custom: ['当前分镜内容', '人物/场景/道具列表'],
  Agent: ['跟随Agent需求一并上线'],
};

const OUTPUT_INFO: Record<SceneType, string> = {
  SRT: '预计输出结构化分镜画面提示词，包含场景、时间、景别、机位、主体、动作与画面描述等信息。',
  Custom: '预计输出可复用的参考分镜提示词，结合人物、场景、道具与当前分镜信息生成完整画面描述。',
  Agent: 'Agent对话模式的输出信息将跟随Agent需求一并上线。',
};

const defaultContent = `### 一、角色与任务定义（Role & Task）
你是一位精通电影摄影理论的导演及顶级 AI 绘画提示词工程师。请根据输入的【拆镜脚本】、【小说原文】和【角色信息】，按严格的 JSON 格式输出用于 AI 文生图的结构化视觉描述。

### 二、核心生成逻辑（Workflow）
对每一个镜头执行以下维度的精准判断：
1. 场景与时间：依据上下文精确定位物理空间及时间。
2. 视听美学：判断光源类型、画面色调、镜头语言与构图关系。
3. 主体与交互：明确镜头角色、站位关系、物理动作与画面重点。
4. 全局修饰词：统一追加电影质感、8k 分辨率、极其详细、杰作、戏剧性光影、完整构图。

### 三、绝对禁令与转换词典（Safety Constraints）
严禁使用任何抽象隐喻、颜色词修饰情绪、服饰描述与代词。必须转换为纯粹的物理面部状态、动作状态和空间关系。`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const highlightPrompt = (code: string) => {
  const grammar = Prism.languages.markdown || Prism.languages.plaintext;
  const html = Prism.highlight(code, grammar, 'markdown');
  return html.replace(/【[^】]+】/g, match => `<span class="text-pink-400">${escapeHtml(match)}</span>`);
};

function CompactSwitch({
  checked,
  disabled,
  label,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2.5 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-zinc-800'
      )}
    >
      <span className="text-sm text-zinc-300">{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-pink-500' : 'bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </span>
    </button>
  );
}

export default function PromptEditorModal({ prompt, isOpen, onClose, onSave }: PromptEditorModalProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<PromptTemplate>>({
    title: '',
    description: '',
    content: '',
    scene: 'SRT',
    isPublic: false,
    allowClone: false,
  });

  useEffect(() => {
    if (prompt) {
      setFormData({
        title: prompt.title || '',
        description: prompt.description || '',
        content: prompt.content || '',
        scene: prompt.scene || 'SRT',
        isPublic: prompt.isPublic ?? false,
        allowClone: prompt.allowClone ?? false,
      });
      return;
    }

    setFormData({
      title: '',
      description: '',
      content: defaultContent,
      scene: 'SRT',
      isPublic: false,
      allowClone: false,
    });
  }, [prompt, isOpen]);

  const currentScene = (formData.scene || 'SRT') as SceneType;
  const isAgentScene = currentScene === 'Agent';
  const fixedParams = FIXED_PARAMS[currentScene];
  const charCount = (formData.content || '').length;

  const handleContentChange = (value: string) => {
    setFormData(previous => ({
      ...previous,
      content: value.length > MAX_CONTENT ? value.slice(0, MAX_CONTENT) : value,
    }));
  };

  const handleSave = () => {
    if (!formData.title?.trim()) {
      alert('请填写模板名称');
      return;
    }
    if (!formData.content?.trim()) {
      alert('提示词模板正文不能为空');
      return;
    }
    onSave(formData);
  };

  const openDebugPage = () => {
    const debugTemplate = {
      id: prompt?.id || `debug-${Date.now()}`,
      title: formData.title || '无标题模板',
      description: formData.description || '',
      content: formData.content || '',
      scene: formData.scene || 'SRT',
      authorName: '我',
      authorId: 'local',
      usageCount: 0,
      favoriteCount: 0,
      isPublic: false,
      allowClone: false,
      isOfficial: false,
    };
    sessionStorage.setItem('debug_template', JSON.stringify(debugTemplate));
    sessionStorage.setItem(
      DEBUG_RETURN_KEY,
      JSON.stringify({
        type: 'editor',
        prompt: prompt?.id
          ? debugTemplate
          : {
              title: formData.title || '',
              description: formData.description || '',
              content: formData.content || '',
              scene: formData.scene || 'SRT',
              isPublic: formData.isPublic ?? false,
              allowClone: formData.allowClone ?? false,
            },
      })
    );
    navigate('/debug');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
            <h2 className="text-base font-semibold">{prompt?.id ? '编辑提示词模板' : '新建提示词模板'}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1">
            <aside className="flex w-[280px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-zinc-800 p-5">
              <section className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  模板名称 <span className="text-pink-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={MAX_TITLE}
                    value={formData.title || ''}
                    onChange={event => setFormData(previous => ({ ...previous, title: event.target.value }))}
                    placeholder="输入模板名称"
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 pr-12 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-pink-500/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-zinc-500">
                    {(formData.title || '').length}/{MAX_TITLE}
                  </span>
                </div>
              </section>

              <section className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">模板简介</label>
                <div className="relative">
                  <textarea
                    maxLength={MAX_DESCRIPTION}
                    value={formData.description || ''}
                    onChange={event => setFormData(previous => ({ ...previous, description: event.target.value }))}
                    placeholder="输入模板简介"
                    className="h-36 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-800 p-3 pb-7 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-pink-500/60"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] tabular-nums text-zinc-500">
                    {(formData.description || '').length}/{MAX_DESCRIPTION}
                  </span>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-medium text-zinc-400">公开设置</p>
                <CompactSwitch
                  label="公开到提示词广场"
                  checked={!!formData.isPublic}
                  onClick={() =>
                    setFormData(previous => ({
                      ...previous,
                      isPublic: !previous.isPublic,
                      allowClone: previous.isPublic ? false : previous.allowClone,
                    }))
                  }
                />
                <CompactSwitch
                  label="允许他人克隆"
                  checked={!!formData.allowClone}
                  disabled={!formData.isPublic}
                  onClick={() => setFormData(previous => ({ ...previous, allowClone: !previous.allowClone }))}
                />
              </section>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
              <section className="shrink-0 space-y-3 border-b border-zinc-800 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-medium text-zinc-400">模板类型</p>
                  {prompt?.id && <span className="text-[11px] text-zinc-600">创建后不可修改</span>}
                </div>
                <div
                  className={cn(
                    'grid grid-cols-3 rounded-lg bg-zinc-800 p-1',
                    prompt?.id && 'cursor-not-allowed opacity-55'
                  )}
                >
                  {SCENE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!!prompt?.id}
                      onClick={() => setFormData(previous => ({ ...previous, scene: option.value }))}
                      className={cn(
                        'h-9 rounded-md text-sm font-medium transition-colors',
                        currentScene === option.value
                          ? 'bg-zinc-950 text-pink-400 shadow-sm'
                          : 'text-zinc-400 hover:text-white',
                        prompt?.id && 'cursor-not-allowed'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              {!isAgentScene && (
                <section className="shrink-0 space-y-2 border-b border-zinc-800 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-zinc-400">当前模板固定传参内容</p>
                    <Info className="h-3.5 w-3.5 text-zinc-600" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fixedParams.map(param => (
                      <span
                        key={param}
                        className="rounded-md border border-zinc-800 bg-zinc-800/70 px-2.5 py-1 text-xs text-zinc-300"
                      >
                        {param}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between px-5 py-3">
                  <label className="text-xs font-medium text-zinc-400">
                    提示词模板正文 <span className="text-pink-400">*</span>
                  </label>
                </div>

                <div className="relative mx-5 mb-5 min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-inner ring-1 ring-white/5 focus-within:border-pink-500/60 focus-within:ring-pink-500/20">
                  <Editor
                    value={formData.content || ''}
                    onValueChange={handleContentChange}
                    highlight={highlightPrompt}
                    padding={20}
                    placeholder="在这里编辑提示词模板正文"
                    className="h-full w-full bg-zinc-950 font-mono text-sm leading-relaxed text-zinc-200"
                    textareaClassName="outline-none resize-none caret-pink-400"
                    preClassName="min-h-full whitespace-pre-wrap break-words"
                    style={{
                      minHeight: '100%',
                      overflow: 'auto',
                    }}
                  />
                  <span
                    className={cn(
                      'absolute bottom-4 right-4 rounded bg-zinc-900/85 px-2 py-1 text-xs tabular-nums text-zinc-500',
                      charCount > MAX_CONTENT * 0.9 && 'text-amber-400'
                    )}
                  >
                    {charCount}/{MAX_CONTENT}
                  </span>
                </div>
              </section>

              {!isAgentScene && (
                <section className="shrink-0 border-t border-zinc-800 px-5 py-4">
                  <p className="mb-1.5 text-xs font-medium text-zinc-400">预计输出的内容信息</p>
                  <p className="text-xs leading-relaxed text-zinc-500">{OUTPUT_INFO[currentScene]}</p>
                </section>
              )}
            </main>
          </div>

          <div className="flex shrink-0 items-center justify-end space-x-3 border-t border-zinc-800 p-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg bg-transparent px-4 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              取消
            </button>
            <button
              type="button"
              onClick={openDebugPage}
              className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <FlaskConical className="h-4 w-4" />
              快速调试
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex h-10 items-center gap-2 rounded-lg border-none bg-gradient-to-r from-pink-500 to-purple-500 px-5 text-sm font-semibold text-white transition-transform active:scale-95"
            >
              <Save className="h-4 w-4" />
              保存
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
