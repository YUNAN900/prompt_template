import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  ArrowRight,
  Send,
  User,
  X,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PromptTemplate, SceneType } from '../types';
import { cn } from '../lib/utils';

const STORAGE_KEY = 'local_prompts';
const DEBUG_RETURN_KEY = 'debug_return_context';
const MAX_HISTORY = 50;

interface AttachedFile {
  name: string;
  type: string;
  url: string;
  isImage: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AttachedFile[];
}

interface VariableInput {
  key: string;
  label: string;
  placeholder: string;
  value: string;
  example: string;
}

const VARIABLE_SETS: Record<SceneType, Omit<VariableInput, 'value'>[]> = {
  SRT: [
    {
      key: 'novel',
      label: '小说原文',
      placeholder: '粘贴对应章节的小说原文',
      example: '夜色笼罩长安城，街道上的灯火渐次亮起。苏云站在客栈二楼，望着远处宫城的轮廓，手中紧握母亲留下的玉佩。',
    },
    {
      key: 'shot',
      label: '当前分镜原文',
      placeholder: '粘贴当前分镜的画面描述',
      example: '镜头：苏云侧身站在木制栏杆旁，月光从右后方照来。她低头看向掌心玉佩，远处宫城琉璃瓦在夜色中微微反光。',
    },
    {
      key: 'assets',
      label: '角色/场景/道具',
      placeholder: '填写角色、场景、道具信息',
      example: '角色：苏云，二十岁，冷静克制。场景：古风客栈二楼回廊。道具：旧玉佩、木栏杆、远处宫城灯火。',
    },
  ],
  Custom: [
    {
      key: 'shot',
      label: '当前分镜内容',
      placeholder: '粘贴当前分镜内容',
      example: '演武场上，叶峰与赵铁对峙。两人已经交手数十招，叶峰忽然踏前一步，掌心凝聚白色光芒。',
    },
    {
      key: 'assets',
      label: '角色/场景/道具',
      placeholder: '填写角色、场景、道具信息',
      example: '角色：叶峰，少年修行者；赵铁，反派武者。场景：青石演武场。道具：兵器架、擂台旗帜、灵力光效。',
    },
  ],
  Agent: [],
};

const VARIABLE_TOKENS: Record<string, string[]> = {
  novel: ['【小说原文】'],
  shot: ['【当前分镜原文】', '【当前分镜内容】', '【拆镜脚本】'],
  assets: ['【角色信息】', '【角色/场景/道具】', '【人物/场景/道具列表】'],
};

const SCENE_LABEL: Record<SceneType, string> = {
  SRT: 'SRT 分镜提示词',
  Custom: '全能参考分镜提示词',
  Agent: 'AI通用对话提示词',
};

const USAGE_SCENE: Record<SceneType, string> = {
  SRT: 'SRT模式',
  Custom: '剧本模式/自由模式',
  Agent: '剧小梦',
};

function buildVariables(scene: SceneType): VariableInput[] {
  return (VARIABLE_SETS[scene] || []).map(item => ({ ...item, value: item.example }));
}

function buildPrompt(template: string, variables: VariableInput[]) {
  let result = template;
  for (const variable of variables) {
    for (const token of VARIABLE_TOKENS[variable.key] || []) {
      result = result.replaceAll(token, variable.value.trim());
    }
  }
  return result;
}

function loadLocalPrompts(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPromptContent(id: string, content: string) {
  const prompts = loadLocalPrompts();
  const next = prompts.map(prompt =>
    prompt.id === id ? { ...prompt, content, updatedAt: new Date().toISOString() } : prompt
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

async function* fakeStream(prompt: string): AsyncGenerator<string> {
  const words = `[调试输出]\n\n收到提示词，长度 ${prompt.length} 字符。\n\n以下为模拟生成结果：\n场景：古风庭院，月夜，近景。主体：女主，面向镜头，低头沉思，手持灯笼。全局基础提示词：电影质感, 8k分辨率, 极其详细, 杰作, 戏剧性光影, 完整构图。`.split(' ');
  for (const word of words) {
    await new Promise(resolve => setTimeout(resolve, 35));
    yield `${word} `;
  }
}

async function* fakeAgentStream(userMessage: string): AsyncGenerator<string> {
  const words = `已收到你的消息：「${userMessage || '附件内容'}」。我会根据当前提示词设定保持一致的角色、语气和任务边界，并继续完成多轮对话测试。`.split('');
  for (const word of words) {
    await new Promise(resolve => setTimeout(resolve, 18));
    yield word;
  }
}

export default function PromptDebugPage() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [variables, setVariables] = useState<VariableInput[]>([]);
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [versionHistory, setVersionHistory] = useState<string[]>([]);
  const [versionIndex, setVersionIndex] = useState(0);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatGenerating, setChatGenerating] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<AttachedFile[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('debug_template');
      if (!raw) {
        navigate('/');
        return;
      }
      const loadedTemplate: PromptTemplate = JSON.parse(raw);
      setTemplate(loadedTemplate);
      setEditedContent(loadedTemplate.content || '');
      setVariables(buildVariables(loadedTemplate.scene));
      setVersionHistory([loadedTemplate.content || '']);
      setVersionIndex(0);
    } catch {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatGenerating]);

  if (!template) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] text-white/30">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const scene = template.scene;
  const isAgent = scene === 'Agent';
  const isOwner = template.authorId === 'local';
  const canShowPrompt = isOwner || template.allowClone || template.isOfficial;
  const canEditPrompt = isOwner;

  const updatePromptContent = (value: string) => {
    setEditedContent(value);
  };

  const recordPromptVersion = () => {
    setVersionHistory(previous => {
      const kept = previous.slice(0, versionIndex + 1);
      if (kept[kept.length - 1] === editedContent) return kept;
      const next = [...kept, editedContent].slice(-MAX_HISTORY);
      setVersionIndex(next.length - 1);
      return next;
    });
  };

  const goToVersion = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= versionHistory.length) return;
    setVersionIndex(nextIndex);
    setEditedContent(versionHistory[nextIndex]);
  };

  const handleBack = () => {
    if (isOwner) {
      saveLocalPromptContent(template.id, editedContent);
      sessionStorage.setItem('debug_template', JSON.stringify({ ...template, content: editedContent }));
    }
    try {
      const raw = sessionStorage.getItem(DEBUG_RETURN_KEY);
      if (raw) {
        const context = JSON.parse(raw);
        if (context?.type === 'editor') {
          sessionStorage.setItem(
            DEBUG_RETURN_KEY,
            JSON.stringify({
              ...context,
              prompt: {
                ...(context.prompt || template),
                content: editedContent,
              },
            })
          );
        }
      }
    } catch {
      sessionStorage.removeItem(DEBUG_RETURN_KEY);
    }
    navigate(-1);
  };

  const fillExamples = () => {
    setVariables(buildVariables(scene));
  };

  const handleGenerate = async () => {
    if (generating) return;
    recordPromptVersion();
    setGenerating(true);
    setOutput('');
    let result = '';
    const prompt = buildPrompt(editedContent, variables);
    for await (const chunk of fakeStream(prompt)) {
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

  const handleFileAttach = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const parsed = files.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        name: file.name,
        type: file.type,
        url: isImage ? URL.createObjectURL(file) : file.name,
        isImage,
      };
    });
    setChatAttachments(previous => [...previous, ...parsed]);
    event.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setChatAttachments(previous => {
      const next = [...previous];
      const [removed] = next.splice(index, 1);
      if (removed?.isImage) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const handleChatSend = async () => {
    const message = chatInput.trim();
    if ((!message && chatAttachments.length === 0) || chatGenerating) return;

    const attachments = [...chatAttachments];
    const nextHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message, attachments }];
    setChatInput('');
    setChatAttachments([]);
    setChatHistory(nextHistory);
    setChatGenerating(true);

    let reply = '';
    for await (const chunk of fakeAgentStream(message)) {
      reply += chunk;
      setChatHistory([...nextHistory, { role: 'assistant', content: reply }]);
    }
    setChatGenerating(false);
  };

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleChatSend();
    }
  };

  const notice = `当前仅用于测试提示词效果，不保留结果，请到【${USAGE_SCENE[scene]}】使用模板`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0F0F0F] text-white">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/5 bg-[#141414] px-6">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {isOwner ? '保存并返回编辑' : '返回'}
        </button>
        <div className="h-5 w-px bg-white/10" />
        <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-pink-300">
          {SCENE_LABEL[scene]}
        </span>
        <span className="max-w-[420px] truncate text-sm font-bold text-white">{template.title}</span>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {canShowPrompt && (
          <aside className="flex w-[390px] shrink-0 flex-col border-r border-white/5 bg-[#111111]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/45">
                <FileText className="h-3.5 w-3.5" />
                提示词模板正文
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToVersion(versionIndex - 1)}
                  disabled={!canEditPrompt || versionIndex === 0}
                  className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="上一版本"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToVersion(versionIndex + 1)}
                  disabled={!canEditPrompt || versionIndex >= versionHistory.length - 1}
                  className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="下一版本"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <textarea
              value={editedContent}
              onChange={event => updatePromptContent(event.target.value)}
              readOnly={!canEditPrompt}
              spellCheck={false}
              className={cn(
                'min-h-0 flex-1 resize-none bg-transparent px-5 py-4 font-mono text-sm leading-relaxed text-white/70 outline-none placeholder:text-white/15',
                !canEditPrompt && 'cursor-default text-white/45'
              )}
              placeholder="提示词正文为空"
            />
          </aside>
        )}

        {!isAgent && (
          <section className="flex w-[330px] shrink-0 flex-col border-r border-white/5 bg-[#111111]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/45">
                <Send className="h-3.5 w-3.5" />
                输入信息
              </div>
              <button
                type="button"
                onClick={fillExamples}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white"
              >
                填入示例
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {variables.map((variable, index) => (
                <label key={variable.key} className="block space-y-2">
                  <span className="text-xs font-bold text-white/45">{variable.label}</span>
                  <textarea
                    rows={5}
                    value={variable.value}
                    onChange={event =>
                      setVariables(previous =>
                        previous.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item
                        )
                      )
                    }
                    placeholder={variable.placeholder}
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#1A1A1A] p-3 text-[15px] leading-relaxed text-white/75 outline-none placeholder:text-white/15 transition-colors focus:border-pink-500/40"
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <main className="flex min-w-0 flex-1 flex-col bg-[#0F0F0F]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/45">
              {isAgent ? <Bot className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              {isAgent ? '对话测试' : '输出结果'}
            </div>
            {isAgent ? (
              <button
                type="button"
                onClick={() => {
                  setChatHistory([]);
                  setChatInput('');
                  setChatAttachments([]);
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/45 transition-colors hover:bg-white/5 hover:text-white"
              >
                创建新对话
              </button>
            ) : output ? (
              <button
                type="button"
                onClick={handleCopyOutput}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/45 transition-colors hover:bg-white/5 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '已复制' : '复制结果'}
              </button>
            ) : null}
          </div>

          {!isAgent ? (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {!output && !generating ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-white/18">
                    <Zap className="h-10 w-10" />
                    <p className="text-sm font-medium">{notice}</p>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-[15px] leading-relaxed text-white/75">
                    {output}
                    {generating && <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-pink-500 align-middle" />}
                  </pre>
                )}
              </div>
              <div className="shrink-0 space-y-3 border-t border-white/5 px-6 py-4">
                <p className="text-center text-xs text-white/25">{notice}</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className={cn(
                    'flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all',
                    generating
                      ? 'cursor-not-allowed bg-white/5 text-white/30'
                      : 'bg-pink-500 text-white hover:shadow-lg hover:shadow-pink-500/20 active:scale-95'
                  )}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {generating ? '生成中...' : '一键生成'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {chatHistory.length === 0 && !chatGenerating && (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-white/18">
                    <Bot className="h-10 w-10" />
                    <p className="text-sm font-medium">{notice}</p>
                  </div>
                )}

                {chatHistory.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        message.role === 'user' ? 'bg-pink-500/20 text-pink-300' : 'bg-white/8 text-white/45'
                      )}
                    >
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={cn(
                        'max-w-[75%] overflow-hidden rounded-2xl text-[15px] leading-relaxed',
                        message.role === 'user'
                          ? 'rounded-tr-sm bg-pink-500/15 text-white/82'
                          : 'rounded-tl-sm border border-white/5 bg-[#1A1A1A] text-white/72'
                      )}
                    >
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-4 pt-3">
                          {message.attachments.map((attachment, attachmentIndex) =>
                            attachment.isImage ? (
                              <img
                                key={attachmentIndex}
                                src={attachment.url}
                                alt={attachment.name}
                                className="max-h-[120px] max-w-[180px] rounded-lg object-cover"
                              />
                            ) : (
                              <div
                                key={attachmentIndex}
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/8 px-2.5 py-1"
                              >
                                <FileText className="h-3.5 w-3.5 text-white/40" />
                                <span className="text-xs text-white/55">{attachment.name}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <pre className="whitespace-pre-wrap px-4 py-3 font-sans">{message.content}</pre>
                    </div>
                  </motion.div>
                ))}

                {chatGenerating && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/45">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border border-white/5 bg-[#1A1A1A] px-4 py-3">
                      <div className="flex h-5 items-center gap-1">
                        {[0, 1, 2].map(item => (
                          <span
                            key={item}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30"
                            style={{ animationDelay: `${item * 0.14}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="shrink-0 space-y-3 border-t border-white/5 px-6 py-4">
                <p className="text-center text-xs text-white/25">{notice}</p>
                {chatAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {chatAttachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex max-w-[180px] items-center gap-1.5 rounded-lg border border-white/8 bg-white/6 px-2.5 py-1"
                      >
                        {attachment.isImage ? (
                          <img src={attachment.url} alt={attachment.name} className="h-5 w-5 shrink-0 rounded object-cover" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 shrink-0 text-white/40" />
                        )}
                        <span className="truncate text-xs text-white/55">{attachment.name}</span>
                        <button type="button" onClick={() => handleRemoveAttachment(index)} className="text-white/25 hover:text-red-400">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.txt,.md,.json"
                    className="hidden"
                    onChange={handleFileAttach}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-white/35 transition-colors hover:bg-white/8 hover:text-white/70"
                    title="上传文件或图片"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-white/35 transition-colors hover:bg-white/8 hover:text-white/70"
                    title="上传图片"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={event => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                    className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/8 bg-[#1A1A1A] px-4 py-3 text-[15px] leading-relaxed text-white/80 outline-none placeholder:text-white/15 transition-colors focus:border-pink-500/35"
                  />
                  <button
                    type="button"
                    onClick={handleChatSend}
                    disabled={(!chatInput.trim() && chatAttachments.length === 0) || chatGenerating}
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all',
                      (chatInput.trim() || chatAttachments.length > 0) && !chatGenerating
                        ? 'bg-pink-500 text-white hover:shadow-lg hover:shadow-pink-500/20 active:scale-95'
                        : 'cursor-not-allowed bg-white/5 text-white/20'
                    )}
                  >
                    {chatGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
