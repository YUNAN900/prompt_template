import { useState } from 'react';
import { PromptTemplate } from '../types';
import { Zap, Sparkles, ArrowRight } from 'lucide-react';
import SRTReferenceModal from '../components/SRTReferenceModal';
import { motion } from 'motion/react';

interface QuickRefProps {
  selectedTemplate: PromptTemplate | null;
  onSelect: (p: PromptTemplate) => void;
}

export default function QuickRef({ selectedTemplate, onSelect }: QuickRefProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="max-w-md w-full text-center space-y-12">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-[#2A2A2A] rounded-[32px] flex items-center justify-center shadow-2xl relative z-10 border border-white/5">
            <Zap className="w-12 h-12 text-pink-500 fill-current" />
          </div>
          <div className="absolute -inset-4 bg-pink-500/10 rounded-[48px] blur-2xl animate-pulse" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-white">SRT 快速引用</h2>
          <p className="text-white/40 text-lg italic">点击下方按钮管理并应用你的 AI 分镜指令</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative w-full h-24 bg-[#2A2A2A] rounded-[32px] border-2 border-white/5 p-2 transition-all hover:border-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/10 overflow-hidden text-white"
        >
          <div className="flex items-center h-full px-6 gap-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-white/40 group-hover:bg-pink-500 group-hover:text-white transition-all shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-1">当前选定模板</p>
              <p className="text-lg font-bold truncate pr-8">
                {selectedTemplate ? selectedTemplate.title : '未选择模板'}
              </p>
            </div>
            <ArrowRight className="w-6 h-6 text-white/10 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="absolute top-0 right-0 w-32 h-full bg-pink-500/5 skew-x-[-20deg] translate-x-16 group-hover:translate-x-8 transition-all" />
        </button>

        <div className="pt-12 grid grid-cols-2 gap-4">
          <div className="p-6 rounded-[24px] bg-[#2A2A2A] border border-white/5 text-left space-y-2">
            <p className="text-xs font-bold text-pink-400">提示词联动</p>
            <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-widest font-medium">支持小说原文、画面描述等动态变量解析</p>
          </div>
          <div className="p-6 rounded-[24px] bg-[#2A2A2A] border border-white/5 text-left space-y-2">
            <p className="text-xs font-bold text-pink-400">本地存储</p>
            <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-widest font-medium">收藏与自定义模板保存在本地浏览器</p>
          </div>
        </div>
      </div>

      <SRTReferenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(p) => {
          onSelect(p);
          setIsModalOpen(false);
          navigator.clipboard.writeText(p.content);
        }}
        currentSelectedId={selectedTemplate?.id}
      />
    </div>
  );
}
