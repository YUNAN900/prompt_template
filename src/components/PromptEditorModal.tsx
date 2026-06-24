import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptTemplate, SceneType } from '../types';
import { X, Save, Info, Sparkles, ChevronDown, ChevronUp, FlaskConical, Zap, Layout, Globe, Lock, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PromptEditorModalProps {
  prompt: Partial<PromptTemplate> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PromptTemplate>) => void;
}

const SCENE_OPTIONS: { value: SceneType; label: string; desc: string }[] = [
  { value: 'SRT', label: 'SRT 分镜提示词', desc: '适用于基于当前分镜原文生成画面提示词' },
  { value: 'Custom', label: '全能参考分镜提示词', desc: '适用于结合小说、角色等信息生成提示词' },
  { value: 'Agent', label: 'Agent 对话', desc: '适用于定义 AI 角色人设与对话行为规范' },
];

const SCENE_VARIABLES: Record<SceneType, string[]> = {
  SRT: ['小说原文', '当前分镜原文', '角色列表'],
  Custom: ['当前分镜内容', '角色列表', '场景列表', '道具列表'],
  Agent: [],
};

const OUTPUT_FORMAT_INFO: Record<SceneType, string | null> = {
  SRT: '系统会自动补充输出格式，无需在正文中重复填写。输出为标准 JSON 结构，包含场景、时间、景别、镜头、主体、动作等字段。',
  Custom: '系统会自动补充输出格式，无需在正文中重复填写。输出为结构化文本，包含画面描述与摄影指令。',
  Agent: null,
};

const SCENE_USAGE_INFO: Record<SceneType, string> = {
  SRT: '该模板会出现在 SRT 分镜推理时，用于生成文生图提示词。',
  Custom: '该模板会出现在自定义分镜推理时，结合小说及角色信息生成提示词。',
  Agent: '该模板定义 AI 对话角色的人格与行为规范，输出格式完全由正文决定。',
};

const defaultContent = `### 一、 角色与任务定义（Role & Task）
你是一位精通电影摄影理论的导演及顶级AI绘画提示词工程师。请根据输入的【拆镜脚本】、【小说原文】和【角色信息】，按严格的 JSON 格式输出用于 AI 文生图的结构化视觉描述。

### 二、 核心生成逻辑（Workflow）
对每个镜头执行以下维度的精准推断：
1.  **场景与时间**：依据上下文精确定位物理空间（如"酒馆吧台前"而非"酒馆里"）及时间/天气。
2.  **视听美学**：推断光源类型（自然光/人工光/硬光/柔光）及画面色调。
3.  **摄影语言**：
    * 景别：远景（环境）、全景（全身交互）、中景（常规叙事）、近景（面部情绪）、特写（细节）。
    * 机位：过肩、背对、仰拍、俯拍、斜角、平视。
4.  **画面主体与交互**：精准提炼出镜角色、站位关系（如"男左女右"）、物理动作。
5.  **全局修饰语**：统一在末尾追加 电影质感, 8k分辨率, 极其详细, 杰作, 戏剧性光影, 完整构图。

### 三、 绝对禁令与转换词典（Safety Constraints）
【最高优先级】：**严禁使用任何修辞隐喻、颜色词修饰情绪，禁止服饰描述与代词（如"我"）。必须转化为纯粹的物理面部状态。**
* **色彩规避**：面色铁青/双颊通红 -> 面部肌肉紧绷/颧骨自然泛红；眼眶通红 -> 下眼睑微肿。
* **隐喻规避**：眼神冒火/杀气腾腾/眼里有光 -> 眼神锐利/眉头紧锁/眼神专注。
* **状态具象化**：咬牙切齿 -> 下颌咬肌绷紧；泪如泉涌 -> 泪水滑落；惊慌失措 -> 瞳孔放大，呼吸急促。
*(注：遇到类似文学词汇，自动按物理规律拆解)*`;

export default function PromptEditorModal({ prompt, isOpen, onClose, onSave }: PromptEditorModalProps) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<Partial<PromptTemplate>>({
    title: '',
    description: '',
    content: '',
    scene: 'SRT' as SceneType,
    isPublic: false,
    allowClone: false,
  });
  const [showFormatDetail, setShowFormatDetail] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX_CONTENT = 4000;

  useEffect(() => {
    if (prompt) {
      setFormData({
        title: prompt.title || '',
        description: prompt.description || '',
        content: prompt.content || '',
        scene: prompt.scene || 'SRT',
        isPublic: prompt.isPublic ?? false,
        allowClone: (prompt as any).allowClone ?? false,
      });
      setCharCount((prompt.content || '').length);
    } else {
      setFormData({
        title: '',
        description: '',
        content: defaultContent,
        scene: 'SRT' as SceneType,
        isPublic: false,
        allowClone: false,
      });
      setCharCount(defaultContent.length);
    }
  }, [prompt, isOpen]);

  const handleSave = () => {
    if (!formData.title?.trim()) { alert('请填写标题'); return; }
    if (!formData.content?.trim()) { alert('提示词正文不能为空'); return; }
    onSave(formData);
  };

  if (!isOpen) return null;

  const currentScene = (formData.scene || 'SRT') as SceneType;
  const variables = SCENE_VARIABLES[currentScene];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative bg-[#1A1A1A] text-white w-full max-w-[960px] max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
        >
          {/* ── Header ── */}
          <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold">
              {prompt?.id ? '编辑提示词模板' : '新建提示词模板'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/8 transition-colors text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Two-column body ── */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ──── LEFT: 模板配置 ──── */}
            <div className="w-[340px] shrink-0 border-r border-white/5 flex flex-col overflow-y-auto no-scrollbar">
              {/* Section header */}
              <div className="px-6 pt-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2 text-white/60 text-sm font-bold">
                  <Layout className="w-4 h-4" />
                  模板配置
                </div>
              </div>

              <div className="px-6 py-5 space-y-6 flex-1">
                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-white/50 mb-2 flex items-center gap-1">
                    标题 <span className="text-pink-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={20}
                      value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                      placeholder="输入标题，限制20字内"
                      className="w-full h-11 px-4 pr-14 rounded-xl bg-[#252525] border border-white/8 focus:border-pink-500/40 outline-none transition-all text-sm text-white placeholder:text-white/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/20 tabular-nums">
                      {(formData.title || '').length}/20
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-white/50 mb-2 block">
                    简介（选填）
                  </label>
                  <div className="relative">
                    <textarea
                      maxLength={100}
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder="输入简介，限制100字"
                      rows={3}
                      className="w-full p-3 rounded-xl bg-[#252525] border border-white/8 focus:border-pink-500/40 outline-none transition-all text-sm resize-none text-white placeholder:text-white/20"
                    />
                    <span className="absolute right-3 bottom-2.5 text-[11px] text-white/20 tabular-nums">
                      {(formData.description || '').length}/100
                    </span>
                  </div>
                </div>

                {/* Scene type */}
                <div>
                  <label className="text-xs font-bold text-white/50 mb-3 flex items-center gap-1.5">
                    提示词类型
                    <Info className="w-3 h-3 text-white/20" />
                    {prompt?.id && (
                      <span className="ml-auto text-[10px] font-normal text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                        创建后不可修改
                      </span>
                    )}
                  </label>
                  <div className={cn("space-y-2.5", prompt?.id && "opacity-50 pointer-events-none cursor-not-allowed")}>
                    {SCENE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFormData(p => ({ ...p, scene: opt.value }))}
                        disabled={!!prompt?.id}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border-2 transition-all group",
                          currentScene === opt.value
                            ? "border-pink-500 bg-pink-500/10"
                            : "border-white/8 bg-[#252525] hover:border-white/20",
                          prompt?.id && "cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                            currentScene === opt.value ? "border-pink-500" : "border-white/20"
                          )}>
                            {currentScene === opt.value && (
                              <div className="w-2 h-2 rounded-full bg-pink-500" />
                            )}
                          </div>
                          <div>
                            <p className={cn(
                              "text-sm font-bold transition-colors",
                              currentScene === opt.value ? "text-pink-400" : "text-white/70"
                            )}>
                              {opt.label}
                            </p>
                            <p className="text-[11px] text-white/30 mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usage info */}
                <div className="p-3.5 rounded-xl bg-blue-500/8 border border-blue-500/15 flex gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    {SCENE_USAGE_INFO[currentScene]}
                  </p>
                </div>

                {/* ── Publish & Clone controls ── */}
                <div className="space-y-3 pt-1">
                  {/* Section label */}
                  <label className="text-xs font-bold text-white/50 flex items-center gap-1.5">
                    公开设置
                  </label>
                  {/* Public toggle */}
                  <div className={cn(
                    "p-3.5 rounded-xl border transition-all",
                    formData.isPublic
                      ? "bg-green-500/8 border-green-500/20"
                      : "bg-[#252525] border-white/8"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          formData.isPublic ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"
                        )}>
                          {formData.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/80">公开至提示词广场</p>
                          <p className="text-[11px] text-white/30 mt-0.5">其他用户可以在广场中发现此模板</p>
                        </div>
                      </div>
                      {/* Toggle switch */}
                      <button
                        onClick={() => setFormData(p => ({ ...p, isPublic: !p.isPublic, allowClone: !p.isPublic ? p.allowClone : false }))}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative shrink-0",
                          formData.isPublic ? "bg-green-500" : "bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                          formData.isPublic ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>

                  {/* Clone toggle — only shown when isPublic is true */}
                  <AnimatePresence>
                    {formData.isPublic && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={cn(
                          "p-3.5 rounded-xl border transition-all",
                          formData.allowClone
                            ? "bg-blue-500/8 border-blue-500/20"
                            : "bg-[#252525] border-white/8"
                        )}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                formData.allowClone ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/20"
                              )}>
                                <Copy className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white/80">允许他人克隆</p>
                                <p className="text-[11px] text-white/30 mt-0.5">其他用户可以将此模板复制到自己的库中</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setFormData(p => ({ ...p, allowClone: !p.allowClone }))}
                              className={cn(
                                "w-11 h-6 rounded-full transition-colors relative shrink-0",
                                formData.allowClone ? "bg-blue-500" : "bg-white/10"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                                formData.allowClone ? "translate-x-5" : "translate-x-0"
                              )} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ──── RIGHT: 生成规则 ──── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Section header */}
              <div className="px-6 pt-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2 text-white/60 text-sm font-bold">
                  <Zap className="w-4 h-4" />
                  生成规则
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-5">
                {/* Hint banner */}
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/15">
                  <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-[12px] text-white/60">
                    {currentScene === 'Agent'
                      ? '对话模板无预设输出格式，正文即最终输出，按需自由定义。'
                      : '只需描述生成规则，系统会自动补充输出格式。'
                    }
                  </p>
                </div>

                {/* Variable info — hidden for Agent */}
                {currentScene !== 'Agent' && (
                  <div>
                    <label className="text-xs font-bold text-white/50 mb-2.5 flex items-center gap-1.5">
                      默认输入
                      <Info className="w-3 h-3 text-white/20" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map(v => (
                        <span
                          key={v}
                          className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] border border-white/8 text-[12px] font-medium text-white/50"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt content editor */}
                <div className="flex-1 flex flex-col space-y-2">
                  <label className="text-xs font-bold text-white/50 flex items-center gap-1">
                    提示词正文 <span className="text-pink-500">*</span>
                  </label>
                  <div className="relative rounded-2xl overflow-hidden border border-white/8 focus-within:border-pink-500/30 transition-all bg-[#252525]">
                    <textarea
                      ref={textareaRef}
                      value={formData.content}
                      maxLength={MAX_CONTENT}
                      onChange={e => {
                        setFormData(p => ({ ...p, content: e.target.value }));
                        setCharCount(e.target.value.length);
                      }}
                      placeholder={currentScene === 'Agent' ? '在这里定义 AI 角色的人格、背景与对话规范…' : '在这里描述你的生成规则…'}
                      className="w-full h-[280px] p-4 bg-transparent outline-none font-mono text-sm leading-relaxed resize-none text-white/85 placeholder:text-white/15"
                    />
                    <div className="px-4 py-2 border-t border-white/5 flex items-center justify-end">
                      <span className={cn(
                        "text-[11px] tabular-nums",
                        charCount > MAX_CONTENT * 0.9 ? "text-amber-400" : "text-white/20"
                      )}>
                        {charCount}/{MAX_CONTENT}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Output format — hidden for Agent */}
                {currentScene !== 'Agent' && (
                  <div className="p-3.5 rounded-xl bg-[#252525] border border-white/8">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2.5 items-start">
                        <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center mt-0.5 shrink-0">
                          <Save className="w-3.5 h-3.5 text-white/25" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/50 mb-0.5">系统输出格式</p>
                          <p className="text-[11px] text-white/35 leading-relaxed">
                            系统会自动补充输出格式，无需在正文中重复填写。
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFormatDetail(v => !v)}
                        className="text-[11px] text-pink-400 hover:text-pink-300 font-bold shrink-0 whitespace-nowrap"
                      >
                        {showFormatDetail ? '收起' : '查看格式'}
                      </button>
                    </div>
                    <AnimatePresence>
                      {showFormatDetail && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-[11px] text-white/40 mt-3 pt-3 border-t border-white/5 leading-relaxed font-mono">
                            {OUTPUT_FORMAT_INFO[currentScene]}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-8 py-4 border-t border-white/5 bg-[#161616] flex items-center gap-4 shrink-0">
            <div className="flex-1 flex items-center gap-2 text-[11px] text-white/20">
              <Save className="w-3.5 h-3.5" />
              系统会自动输出为固定格式
            </div>
            <button
              onClick={onClose}
              className="px-6 h-11 rounded-xl border border-white/10 font-bold text-sm hover:bg-white/5 transition-colors text-white/60"
            >
              取消
            </button>
            <button
              onClick={() => {
                // Snapshot current formData into sessionStorage and open debug page
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
                navigate('/debug');
              }}
              className="px-6 h-11 rounded-xl border border-pink-500/30 text-pink-400 font-bold text-sm hover:bg-pink-500/10 transition-all flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" /> 快速调试
            </button>
            <button
              onClick={handleSave}
              className="px-8 h-11 bg-pink-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-pink-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> 保存并生效
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
