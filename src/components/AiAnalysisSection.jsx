import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Settings,
  Square,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getAiConfig, streamAiCompletion, AI_PROVIDERS, AI_READING_GUARD } from '../utils/aiService';
import CopyPromptButton from './CopyPromptButton';

export default function AiAnalysisSection({
  title = 'AI 大師深度解讀',
  prompt = '',
  systemPrompt = '你是一位精通易經六爻納甲、梅花易數、紫微斗數與現代心理學的資深國學大師。請依據提供的客觀排盤數據，為求占者提供條理清晰、語氣溫暖、直指核心且兼具具體行動指南的繁體中文深度解讀。',
  onOpenSettings,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const abortControllerRef = useRef(null);
  const outputRef = useRef(null);

  // 當外部 prompt 改變時，如果沒有在生成，清空或保留
  useEffect(() => {
    // 卦象重算時重置
    setAnalysisText('');
    setErrorMessage('');
  }, [prompt]);

  // 滾動到底部
  useEffect(() => {
    if (isGenerating && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [analysisText, isGenerating]);

  const handleStartAnalysis = async () => {
    setErrorMessage('');
    const config = getAiConfig();

    if (!config.activeKey) {
      if (onOpenSettings) onOpenSettings();
      return;
    }

    if (!prompt.trim()) {
      setErrorMessage('尚無排盤資料可供解讀，請先完成起卦排盤。');
      return;
    }

    setIsGenerating(true);
    setAnalysisText('');
    setIsExpanded(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const messages = [
        { role: 'system', content: `${systemPrompt}\n\n${AI_READING_GUARD}` },
        { role: 'user', content: prompt },
      ];

      await streamAiCompletion({
        provider: config.provider,
        apiKey: config.activeKey,
        model: config.activeModel,
        messages,
        signal: controller.signal,
        onChunk: (chunk) => {
          setAnalysisText((prev) => prev + chunk);
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        // 使用者手動終止
      } else {
        setErrorMessage(err.message || 'AI 生成過程中發生錯誤');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = getAiConfig();
  const providerLabel = config.provider === AI_PROVIDERS.GEMINI ? 'Google Gemini' : 'OpenRouter';
  const modelLabel = config.activeModel;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-slate-100 rounded-2xl border border-indigo-500/30 shadow-xl overflow-hidden mt-6 transition-all font-sans">
      {/* 標題列 */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-indigo-500/20 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              {title}
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {config.activeKey ? `${providerLabel} · ${modelLabel}` : '尚未綁定 API Key'}
              </span>
            </h4>
            <p className="text-xs text-indigo-300/80">
              融合易學邏輯與大模型深度推理，提供客製化白話斷語與指引
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 transition text-xs flex items-center gap-1.5"
            title="調整 AI 模型與 API Key 設定"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI 設定</span>
          </button>

          {analysisText && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 內容區塊 */}
      <div className="p-5 space-y-4">
        {/* 未開始 / 啟動按鈕 */}
        {!analysisText && !isGenerating && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-indigo-400 shrink-0" />
              <div className="text-xs text-slate-300">
                {config.activeKey ? (
                  <span>
                    已就緒！點擊右側按鈕即刻調用 <strong className="text-amber-300 font-mono">{modelLabel}</strong> 進行全方位深度推演。
                  </span>
                ) : (
                  <span>
                    尚未設定 API Key，點擊設定即可填入個人的 <strong className="text-amber-300">Gemini</strong> 或 <strong className="text-purple-300">OpenRouter</strong> Key（支援免費額度）。
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleStartAnalysis}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                {config.activeKey ? '開始 AI 深度解卦' : '⚙️ 設定 API Key 並開始'}
              </button>
              <CopyPromptButton systemPrompt={systemPrompt} prompt={prompt} className="w-full sm:w-auto" />
            </div>
          </div>
        )}

        {/* 錯誤提示 */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{errorMessage}</p>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-amber-300 underline hover:text-amber-200"
              >
                檢查或更換 API Key 設定
              </button>
            </div>
          </div>
        )}

        {/* 串流生成中狀態列 */}
        {isGenerating && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI 大師推演運算中...（已生成 {analysisText.length} 字）</span>
            </div>
            <button
              type="button"
              onClick={handleStop}
              className="px-3 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 transition flex items-center gap-1 font-medium"
            >
              <Square className="w-3 h-3 fill-current" />
              中斷生成
            </button>
          </div>
        )}

        {/* 生成文字顯示區塊 */}
        {(analysisText || isGenerating) && isExpanded && (
          <div className="space-y-3">
            <div
              ref={outputRef}
              className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto font-sans tracking-wide select-text shadow-inner"
            >
              {analysisText}
              {isGenerating && (
                <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
              )}
            </div>

            {/* 操作工具列 */}
            {!isGenerating && analysisText && (
              <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重新解讀
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      已複製全文
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      複製完整 AI 報告
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
