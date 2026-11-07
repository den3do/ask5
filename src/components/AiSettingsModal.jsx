import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Bot,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Save,
  HelpCircle
} from 'lucide-react';
import {
  AI_PROVIDERS,
  GEMINI_DEFAULT_MODELS,
  OPENROUTER_DEFAULT_MODELS,
  getAiConfig,
  saveAiConfig,
  testAiConnection
} from '../utils/aiService';

export default function AiSettingsModal({ isOpen, onClose, onSaved }) {
  const [provider, setProvider] = useState(AI_PROVIDERS.GEMINI);
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState(GEMINI_DEFAULT_MODELS[0].id);
  const [isCustomGemini, setIsCustomGemini] = useState(false);
  const [customGeminiInput, setCustomGeminiInput] = useState('');

  const [openrouterKey, setOpenrouterKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState(OPENROUTER_DEFAULT_MODELS[0].id);
  const [isCustomOpenrouter, setIsCustomOpenrouter] = useState(false);
  const [customOpenrouterInput, setCustomOpenrouterInput] = useState('');

  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState('idle'); // 'idle' | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');

  // 彈出時載入現有設定
  useEffect(() => {
    if (isOpen) {
      const config = getAiConfig();
      setProvider(config.provider);
      setGeminiKey(config.geminiKey);
      setOpenrouterKey(config.openrouterKey);

      // Gemini 模型判斷
      const foundGemini = GEMINI_DEFAULT_MODELS.find(m => m.id === config.geminiModel);
      if (foundGemini) {
        setGeminiModel(config.geminiModel);
        setIsCustomGemini(false);
      } else {
        setGeminiModel('custom');
        setIsCustomGemini(true);
        setCustomGeminiInput(config.geminiModel);
      }

      // OpenRouter 模型判斷
      const foundOR = OPENROUTER_DEFAULT_MODELS.find(m => m.id === config.openrouterModel);
      if (foundOR) {
        setOpenrouterModel(config.openrouterModel);
        setIsCustomOpenrouter(false);
      } else {
        setOpenrouterModel('custom');
        setIsCustomOpenrouter(true);
        setCustomOpenrouterInput(config.openrouterModel);
      }

      setTestStatus('idle');
      setTestMessage('');
      setShowKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 取得有效 model id
  const effectiveGeminiModel = isCustomGemini ? (customGeminiInput.trim() || 'gemini-3.5-flash-lite') : geminiModel;
  const effectiveOpenrouterModel = isCustomOpenrouter ? (customOpenrouterInput.trim() || 'deepseek/deepseek-chat') : openrouterModel;

  // 儲存設定
  const handleSave = () => {
    saveAiConfig({
      provider,
      geminiKey: geminiKey.trim(),
      geminiModel: effectiveGeminiModel,
      openrouterKey: openrouterKey.trim(),
      openrouterModel: effectiveOpenrouterModel,
    });
    if (onSaved) onSaved();
    onClose();
  };

  // 測試連線
  const handleTestConnection = async () => {
    const currentKey = provider === AI_PROVIDERS.GEMINI ? geminiKey : openrouterKey;
    const currentModel = provider === AI_PROVIDERS.GEMINI ? effectiveGeminiModel : effectiveOpenrouterModel;

    if (!currentKey.trim()) {
      setTestStatus('error');
      setTestMessage(`請先填寫 ${provider === AI_PROVIDERS.GEMINI ? 'Google Gemini' : 'OpenRouter'} 的 API Key`);
      return;
    }

    setTestStatus('testing');
    setTestMessage('連線測試中，請稍候...');

    try {
      const res = await testAiConnection({
        provider,
        apiKey: currentKey.trim(),
        model: currentModel,
      });
      setTestStatus('success');
      setTestMessage(`連線成功！模型回應：「${res.message}」`);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || '連線測試失敗，請確認 Key 或模型代碼是否正確');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                AI 智慧解盤設定
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  純前端本地加密儲存 (BYOK)
                </span>
              </h3>
              <p className="text-xs text-slate-400">自備 API Key 串接，不透過任何第三方中轉，安全不外洩</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Provider Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              選擇 AI 服務商 (Provider)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setProvider(AI_PROVIDERS.GEMINI); setTestStatus('idle'); }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition ${
                  provider === AI_PROVIDERS.GEMINI
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Google Gemini
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">推薦</span>
              </button>

              <button
                type="button"
                onClick={() => { setProvider(AI_PROVIDERS.OPENROUTER); setTestStatus('idle'); }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition ${
                  provider === AI_PROVIDERS.OPENROUTER
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                OpenRouter
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">全聚合</span>
              </button>
            </div>
          </div>

          {/* Gemini 設定區塊 */}
          {provider === AI_PROVIDERS.GEMINI && (
            <div className="space-y-4 animate-fade-in">
              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    免費取得 Gemini Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => { setGeminiKey(e.target.value); setTestStatus('idle'); }}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gemini Model 選擇 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gemini 模型版本
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGeminiModel(val);
                    setIsCustomGemini(val === 'custom');
                    setTestStatus('idle');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                >
                  {GEMINI_DEFAULT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  <option value="custom">✏️ 自訂模型代碼 (Custom Model ID)...</option>
                </select>

                {isCustomGemini && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      type="text"
                      value={customGeminiInput}
                      onChange={(e) => { setCustomGeminiInput(e.target.value); setTestStatus('idle'); }}
                      placeholder="輸入自訂模型名稱，例如：gemini-3.5-flash-lite"
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OpenRouter 設定區塊 */}
          {provider === AI_PROVIDERS.OPENROUTER && (
            <div className="space-y-4 animate-fade-in">
              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    OpenRouter API Key
                  </label>
                  <a
                    href="https://openrouter.ai/settings/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    前往 OpenRouter 獲取 Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={openrouterKey}
                    onChange={(e) => { setOpenrouterKey(e.target.value); setTestStatus('idle'); }}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* OpenRouter Model 選擇 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  OpenRouter 模型版本 (包含 DeepSeek / Claude / Llama)
                </label>
                <select
                  value={openrouterModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOpenrouterModel(val);
                    setIsCustomOpenrouter(val === 'custom');
                    setTestStatus('idle');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                >
                  {OPENROUTER_DEFAULT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  <option value="custom">✏️ 自訂 OpenRouter 模型代碼...</option>
                </select>

                {isCustomOpenrouter && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      type="text"
                      value={customOpenrouterInput}
                      onChange={(e) => { setCustomOpenrouterInput(e.target.value); setTestStatus('idle'); }}
                      placeholder="輸入 OpenRouter 模型 ID，例如：deepseek/deepseek-chat"
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 測試連線回饋結果 */}
          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition ${
                testStatus === 'testing'
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                  : testStatus === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400 mt-0.5" />}
              {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />}
              {testStatus === 'error' && <XCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />}
              <span className="leading-relaxed break-all">{testMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={testStatus === 'testing'}
            onClick={handleTestConnection}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {testStatus === 'testing' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>🧪 測試連線</span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              儲存並套用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
