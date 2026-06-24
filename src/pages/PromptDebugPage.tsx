import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptTemplate, SceneType } from '../types';
import { cn } from '../lib/utils';
import {
  ArrowLeft,
  Send,
  Loader2,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Bot,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Paperclip,
  ImageIcon,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttachedFile {
  name: string;
  type: string; // mime
  url: string;  // object URL for images; filename for others
  isImage: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AttachedFile[];
}

interface VariableInput {
  label: string;
  placeholder: string;
  value: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCENE_VARIABLES: Record<SceneType, { label: string; placeholder: string; defaultValue: string }[]> = {
  SRT: [
    {
      label: '小说原文',
      placeholder: '粘贴对应章节的小说原文…',
      defaultValue: '夜色笼罩着长安城，街道上行人寥寥。苏云站在客栈二楼，望着远处宫城的灯火，心中涌起一阵莫名的惆怅。她轻轻叹了口气，手指无意识地摩挲着腰间的玉佩——那是母亲留下的唯一遗物。楼下传来喧哗声，她的目光缓缓收回。',
    },
    {
      label: '当前分镜原文',
      placeholder: '粘贴当前分镜的画面描述…',
      defaultValue: '镜头：苏云侧身立于木制栏杆旁，月光从右后方打来，将她的轮廓勾勒成一道细碎的银边。她低头，目光落在手中玉佩上，神情若有所思。远景处，宫城的琉璃瓦在夜色中微微反光。',
    },
    {
      label: '角色信息',
      placeholder: '描述出现在该分镜的角色信息…',
      defaultValue: '苏云，女，约二十岁。身着靛青色长裙，发髻以银簪挽起，气质冷静内敛，眉宇间藏有一丝忧郁。擅长易容与暗器，表面是客栈掌柜之女，实为暗阁密探。',
    },
  ],
  Custom: [
    {
      label: '小说原文',
      placeholder: '粘贴对应章节的小说原文…',
      defaultValue: '演武场上，叶峰与赵铁的对决吸引了所有人的目光。两人已交手三十余招，彼此都渐显疲态，但眼神却愈发锋利。叶峰深吸一口气，体内的灵力开始缓缓流转，他知道，决胜的时刻到了。他猛地踏前一步，掌心凝聚出耀眼的白芒，向着赵铁轰去。',
    },
    {
      label: '角色信息',
      placeholder: '描述主要角色信息…',
      defaultValue: '叶峰：男主，约十八岁，短发黑衣，体型精壮，性格坚毅果敢。灵力属性为光系，战斗时双手会发出白色光芒。赵铁：反派，三十岁，身形魁梧，满脸络腮胡，身穿暗红色战甲，修为高于叶峰一个大境界。',
    },
  ],
  Agent: [],
};

const VARIABLE_TOKEN_MAP: Record<string, string> = {
  '小说原文': '【小说原文】',
  '当前分镜原文': '【当前分镜原文】',
  '角色信息': '【角色信息】',
};

function buildPrompt(template: string, vars: VariableInput[]): string {
  let result = template;
  for (const v of vars) {
    const token = VARIABLE_TOKEN_MAP[v.label];
    if (token && v.value.trim()) {
      result = result.replaceAll(token, v.value.trim());
    }
  }
  return result;
}

/** Simulated streaming generation — replace with real API call as needed */
async function* fakeStream(prompt: string): AsyncGenerator<string> {
  const words = `[调试输出]\n\n收到提示词，长度 ${prompt.length} 字符。\n\n以下为模拟生成结果：\n场景：古风庭院，月夜，近景。主体：女主，面向镜头，低头沉思，手持灯笼。全局基础提示词：电影质感, 8k分辨率, 极其详细, 杰作, 戏剧性光影, 完整构图。`.split(' ');
  for (const word of words) {
    await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
    yield word + ' ';
  }
}

async function* fakeAgentStream(systemPrompt: string, history: ChatMessage[], userMsg: string): AsyncGenerator<string> {
  const words = `[角色回复]\n\n你好！我已接收到你的消息："${userMsg.slice(0, 30)}${userMsg.length > 30 ? '…' : ''}"。根据设定的角色规范，我将保持一致的对话风格与人格。`.split(' ');
  for (const word of words) {
    await new Promise(r => setTimeout(r, 35 + Math.random() * 55));
    yield word + ' ';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PromptDebugPage() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [variables, setVariables] = useState<VariableInput[]>([]);
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  // Agent chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatGenerating, setChatGenerating] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<AttachedFile[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load template from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('debug_template');
      if (raw) {
        const t: PromptTemplate = JSON.parse(raw);
        setTemplate(t);
        setEditedContent(t.content);
        const scene = t.scene as SceneType;
        setVariables(
          (SCENE_VARIABLES[scene] || []).map(v => ({ ...v, value: v.defaultValue }))
        );
      }
    } catch {
      navigate('/');
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatGenerating]);

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F0F0F] text-white/30">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const isAgent = template.scene === 'Agent';
  const scene = template.scene as SceneType;

  // ── Single generation ──────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setOutput('');
    const builtPrompt = buildPrompt(editedContent, variables);
    let result = '';
    for await (const chunk of fakeStream(builtPrompt)) {
      result += chunk;
      setOutput(result);
    }
    setGenerating(false);
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Agent chat ─────────────────────────────────────────────────────────────

  const handleFileAttach = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const parsed: AttachedFile[] = files.map(f => {
      const isImage = f.type.startsWith('image/');
      return {
        name: f.name,
        type: f.type,
        url: isImage ? URL.createObjectURL(f) : f.name,
        isImage,
      };
    });
    setChatAttachments(prev => [...prev, ...parsed]);
    // reset input so same file can be re-attached
    e.target.value = '';
  };

  const handleRemoveAttachment = (idx: number) => {
    setChatAttachments(prev => {
      const updated = [...prev];
      if (updated[idx].isImage) URL.revokeObjectURL(updated[idx].url);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if ((!msg && chatAttachments.length === 0) || chatGenerating) return;
    setChatInput('');
    const attachments = [...chatAttachments];
    setChatAttachments([]);
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: msg, attachments }];
    setChatHistory(newHistory);
    setChatGenerating(true);
    let reply = '';
    const appendMsg = (c: string) => {
      reply += c;
      setChatHistory([...newHistory, { role: 'assistant', content: reply }]);
    };
    for await (const chunk of fakeAgentStream(editedContent, newHistory, msg)) {
      appendMsg(chunk);
    }
    setChatGenerating(false);
  };

  const handleChatKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    setChatInput('');
    setChatAttachments([]);
  };

  const canGenerate = !generating && (isAgent || variables.every(v => !v.value.trim()) || true);

  // ── Render ─────────────────────────────────────────────────────────────────

  const SCENE_LABEL: Record<SceneType, string> = {
    SRT: 'SRT 分镜',
    Custom: '全能参考',
    Agent: 'Agent 对话',
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F0F0F] text-white overflow-hidden">

      {/* ── Top bar ── */}
      <div className="h-14 border-b border-white/5 flex items-center px-6 gap-4 shrink-0 bg-[#141414]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 返回编辑
        </button>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 uppercase tracking-wider">
            {SCENE_LABEL[scene]}
          </span>
          <span className="text-sm font-bold text-white truncate max-w-[280px]">{template.title}</span>
        </div>
        <div className="ml-auto text-[11px] text-white/20 flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> 快速调试模式
        </div>
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ──── COL 1: Template info ──── */}
        <div className="w-[420px] shrink-0 border-r border-white/5 flex flex-col overflow-hidden bg-[#111111]">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5" /> 模板正文
            </div>
            <div className="flex items-center gap-2">
              {editedContent !== template.content && (
                <button
                  onClick={() => setEditedContent(template.content)}
                  className="text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors font-bold"
                  title="还原修改"
                >
                  还原
                </button>
              )}
              <button
                onClick={() => setPromptCollapsed(v => !v)}
                className="text-white/20 hover:text-white/50 transition-colors"
              >
                {promptCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <AnimatePresence initial={false}>
              {!promptCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  <textarea
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    spellCheck={false}
                    className="flex-1 w-full h-full px-5 py-4 bg-transparent outline-none font-mono text-[11px] leading-relaxed text-white/60 placeholder:text-white/15 resize-none no-scrollbar"
                    placeholder="提示词正文为空"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {promptCollapsed && (
              <p className="px-5 py-4 text-[11px] text-white/20 italic">已折叠，点击 ↑ 展开</p>
            )}
          </div>
        </div>

        {/* ──── COL 2: Inputs + Generate — hidden for Agent ──── */}
        {!isAgent && <div className="w-[320px] shrink-0 border-r border-white/5 flex flex-col bg-[#111111]">
          <div className="px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
              <Send className="w-3.5 h-3.5" />
              {isAgent ? 'Agent 配置' : '输入变量'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
            {isAgent ? (
              /* Agent mode: show system prompt summary */
              <div className="p-4 rounded-xl bg-[#1A1A1A] border border-white/5 space-y-2">
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">System Prompt</p>
                <p className="text-[12px] text-white/50 leading-relaxed line-clamp-6">{editedContent}</p>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[11px] text-white/25">Agent 对话模式下，正文作为系统提示词，在右侧对话框中与 AI 进行多轮对话测试。</p>
                </div>
              </div>
            ) : (
              /* SRT / Custom mode: variable inputs */
              variables.length > 0 ? variables.map((v, i) => (
                <div key={v.label}>
                  <label className="text-[11px] font-bold text-white/40 mb-1.5 block">{v.label}</label>
                  <textarea
                    rows={4}
                    value={v.value}
                    onChange={e => setVariables(prev =>
                      prev.map((item, idx) => idx === i ? { ...item, value: e.target.value } : item)
                    )}
                    placeholder={v.placeholder}
                    className="w-full p-3 rounded-xl bg-[#1A1A1A] border border-white/8 text-sm text-white/70 placeholder:text-white/15 outline-none resize-none focus:border-pink-500/30 transition-colors leading-relaxed"
                  />
                </div>
              )) : (
                <p className="text-[12px] text-white/20 italic text-center py-8">此类型无需输入变量</p>
              )
            )}
          </div>

          {/* Generate button */}
          <div className="px-5 py-4 border-t border-white/5 shrink-0">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={cn(
                "w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                generating
                  ? "bg-white/5 text-white/30 cursor-not-allowed"
                  : "bg-pink-500 text-white hover:shadow-lg hover:shadow-pink-500/20 active:scale-95"
              )}
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 生成中…</>
              ) : (
                <><Zap className="w-4 h-4" /> 开始生成</>
              )}
            </button>
            {output && (
              <button
                onClick={() => { setOutput(''); }}
                className="w-full mt-2 h-9 rounded-xl border border-white/8 text-[12px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 清空重试
              </button>
            )}
          </div>
        </div>}

        {/* ──── COL 3: Output / Chat ──── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0F0F0F]">

          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
              {isAgent ? <Bot className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
              {isAgent ? '对话测试' : '生成结果'}
            </div>
            {!isAgent && output && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyOutput}
                  className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-white/5 border border-white/8 text-[11px] text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            )}
            {isAgent && chatHistory.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-white/5 border border-white/8 text-[11px] text-white/40 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all"
              >
                <RotateCcw className="w-3 h-3" /> 清空对话
              </button>
            )}
          </div>

          {/* ── Non-Agent output ── */}
          {!isAgent && (
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5">
              {!output && !generating && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-white/15">
                  <Zap className="w-10 h-10" />
                  <p className="text-sm font-medium">填写左侧变量后点击「开始生成」</p>
                </div>
              )}
              {(output || generating) && (
                <div className="relative">
                  <pre className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap font-mono">
                    {output}
                    {generating && (
                      <span className="inline-block w-2 h-4 bg-pink-500 ml-0.5 animate-pulse rounded-sm align-middle" />
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ── Agent chat ── */}
          {isAgent && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-4">
                {chatHistory.length === 0 && !chatGenerating && (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-white/15">
                    <Bot className="w-10 h-10" />
                    <p className="text-sm font-medium">在下方输入消息开始对话</p>
                  </div>
                )}

                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      msg.role === 'user'
                        ? "bg-pink-500/20 text-pink-400"
                        : "bg-white/8 text-white/40"
                    )}>
                      {msg.role === 'user'
                        ? <User className="w-3.5 h-3.5" />
                        : <Bot className="w-3.5 h-3.5" />
                      }
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                      "max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden",
                      msg.role === 'user'
                        ? "bg-pink-500/15 text-white/80 rounded-tr-sm"
                        : "bg-[#1A1A1A] text-white/70 rounded-tl-sm border border-white/5"
                    )}>
                      {/* Attachment thumbnails for user messages */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-4 pt-3">
                          {msg.attachments.map((att, ai) => (
                            <div key={ai} className="flex items-center gap-1.5">
                              {att.isImage
                                ? <img src={att.url} alt={att.name} className="max-w-[160px] max-h-[120px] rounded-lg object-cover" />
                                : (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 border border-white/10">
                                    <FileText className="w-3.5 h-3.5 text-white/40" />
                                    <span className="text-[11px] text-white/50">{att.name}</span>
                                  </div>
                                )
                              }
                            </div>
                          ))}
                        </div>
                      )}
                      <pre className="whitespace-pre-wrap font-sans px-4 py-3">{msg.content}
                        {i === chatHistory.length - 1 && msg.role === 'assistant' && chatGenerating && (
                          <span className="inline-block w-1.5 h-3.5 bg-white/50 ml-0.5 animate-pulse rounded-sm align-middle" />
                        )}
                      </pre>
                    </div>
                  </motion.div>
                ))}

                {/* Generating indicator when no assistant message yet */}
                {chatGenerating && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/8 text-white/40 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1A1A1A] border border-white/5">
                      <div className="flex gap-1 items-center h-5">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Input area */}
              <div className="px-6 py-4 border-t border-white/5 shrink-0 space-y-2">
                {/* Attachment previews */}
                {chatAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {chatAttachments.map((att, idx) => (
                      <div key={idx} className="relative group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/6 border border-white/8 max-w-[160px]">
                        {att.isImage
                          ? <img src={att.url} alt={att.name} className="w-5 h-5 rounded object-cover shrink-0" />
                          : <FileText className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        }
                        <span className="text-[11px] text-white/50 truncate">{att.name}</span>
                        <button
                          onClick={() => handleRemoveAttachment(idx)}
                          className="ml-0.5 text-white/20 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  {/* Attach buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.txt,.md,.json"
                      className="hidden"
                      onChange={handleFileAttach}
                    />
                    <button
                      onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); } }}
                      className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-all"
                      title="上传图片"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'application/pdf,.txt,.md,.json'; fileInputRef.current.click(); } }}
                      className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-all"
                      title="上传文件"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Text input */}
                  <div className="flex-1">
                    <textarea
                      ref={chatInputRef}
                      rows={2}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      placeholder="输入消息… Enter 发送，Shift+Enter 换行"
                      className="w-full px-4 py-3 rounded-2xl bg-[#1A1A1A] border border-white/8 text-sm text-white/80 placeholder:text-white/15 outline-none resize-none focus:border-pink-500/30 transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Send */}
                  <button
                    onClick={handleChatSend}
                    disabled={(!chatInput.trim() && chatAttachments.length === 0) || chatGenerating}
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                      (chatInput.trim() || chatAttachments.length > 0) && !chatGenerating
                        ? "bg-pink-500 text-white hover:shadow-lg hover:shadow-pink-500/20 active:scale-95"
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                  >
                    {chatGenerating
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                  </button>
                </div>
                <p className="text-[10px] text-white/15 text-center">
                  系统提示词已载入 · 当前为调试模式
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
