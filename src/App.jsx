import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Sparkles, Compass, CheckCircle2, Bot, Menu, X, HeartHandshake, Brain,
} from 'lucide-react';
import AiSettingsModal from './components/AiSettingsModal';
import DivinationPanel from './components/DivinationPanel';
const PersonalHub = lazy(() => import('./components/PersonalHub'));
const SynastryReport = lazy(() => import('./components/SynastryReport'));
const MbtiTest = lazy(() => import('./components/MbtiTest'));

const PanelLoading = () => (
  <div className="p-8 text-center text-sm text-stone-500 font-sans">載入中…</div>
);


const DivinationApp = () => {
  // 當前功能 Tab：1=一事一占, 2=個人命理（命卦/紫微/人類圖/西洋/融合）, 3=雙人合盤
  const [activeTab, setActiveTab] = useState(1);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 使用者字體大小（縮放根字級，所有 rem 單位連動）
  const FONT_STEPS = [14, 16, 18, 20, 22, 24];
  const [fontIdx, setFontIdx] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem('ask5_font_idx'), 10);
      return v >= 0 && v < FONT_STEPS.length ? v : 1;
    } catch { return 1; }
  });
  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_STEPS[fontIdx]}px`;
    try { localStorage.setItem('ask5_font_idx', String(fontIdx)); } catch { /* ignore */ }
  }, [fontIdx]);

  const TABS = [
    { id: 1, label: '一事一占', Icon: Sparkles },
    { id: 2, label: '個人命理', Icon: Compass },
    { id: 3, label: '雙人合盤', Icon: HeartHandshake },
    { id: 4, label: 'MBTI 人格', Icon: Brain },
  ];

  // 右上角「已複製」提示（一事一占等子元件透過 copyToClipboard 觸發）
  const [copiedText, setCopiedText] = useState('');

  const selectTab = (id) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  const copyToClipboard = async (text, message = '已複製到剪貼簿！') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(message);
    } catch {
      setCopiedText('無法自動複製，請手動選取文字複製');
    }
    setTimeout(() => setCopiedText(''), 2500);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-serif selection:bg-stone-800 selection:text-white">
      {/* 頁首標題 */}
      <header className="bg-stone-900 text-stone-100 border-b-4 border-amber-600 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-amber-500 font-sans tracking-widest text-xs uppercase mb-1">
                <span>周易天地</span><span>•</span><span>紫微斗數</span><span>•</span><span>西洋占星</span><span>•</span><span>人類圖</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-wide text-white truncate">
                易數神策 ‧ 命理排盤系統
              </h1>
              <p className="hidden md:block text-stone-400 text-sm mt-1">
                易經六爻 ‧ 紫微斗數 ‧ 西洋占星 ‧ 人類圖 ‧ 全象報告與雙人合盤
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center rounded-lg border border-stone-600 bg-stone-800 font-sans" role="group" aria-label="字體大小">
                <button
                  type="button"
                  onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
                  disabled={fontIdx === 0}
                  className="px-2.5 py-2.5 text-stone-200 text-xs font-bold disabled:opacity-30 hover:text-amber-300"
                  aria-label="縮小字體"
                  title="縮小字體"
                >A−</button>
                <span className="text-[11px] text-stone-400 w-9 text-center tabular-nums">{FONT_STEPS[fontIdx]}px</span>
                <button
                  type="button"
                  onClick={() => setFontIdx((i) => Math.min(FONT_STEPS.length - 1, i + 1))}
                  disabled={fontIdx === FONT_STEPS.length - 1}
                  className="px-2.5 py-2.5 text-stone-200 text-base font-bold disabled:opacity-30 hover:text-amber-300"
                  aria-label="放大字體"
                  title="放大字體"
                >A+</button>
              </div>
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-amber-500/40 bg-stone-800 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-sm font-bold shadow-md transition"
                title="設定 Google Gemini / OpenRouter API Key"
              >
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">AI 設定</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-stone-600 bg-stone-800 text-stone-100 text-sm font-bold"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label="開啟功能選單"
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span className="max-w-[7rem] truncate">{TABS.find((t) => t.id === activeTab)?.label}</span>
              </button>
            </div>
          </div>

          {/* 桌面版導覽 */}
          <nav className="hidden lg:flex flex-wrap gap-1 rounded-lg border border-stone-700 bg-stone-800 p-1" aria-label="功能分頁">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-sm font-bold transition-all ${
                  activeTab === id ? 'bg-amber-600 text-white shadow' : 'text-stone-300 hover:text-white hover:bg-stone-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* 手機版漢堡選單 */}
          {menuOpen && (
            <nav id="mobile-nav" className="lg:hidden grid grid-cols-2 gap-2" aria-label="功能分頁">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-bold border ${
                    activeTab === id ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* 提示訊息 */}
      {copiedText && (
        <div className="fixed top-4 right-4 z-50 bg-stone-900 text-amber-400 border border-amber-500 px-4 py-2 rounded-lg shadow-xl text-sm font-sans flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {copiedText}
        </div>
      )}

      {/* 主要內容容器 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* ========================================================= */}
        {/* TAB 1: 一事一占 */}
        {/* ========================================================= */}
        {/* 一事一占：切換分頁時保留結果，所以只隱藏不卸載 */}
        <div hidden={activeTab !== 1}>
          <DivinationPanel onOpenSettings={() => setIsAiModalOpen(true)} copyToClipboard={copyToClipboard} />
        </div>

        {activeTab === 2 && (
          <Suspense fallback={<PanelLoading />}>
            <PersonalHub onOpenSettings={() => setIsAiModalOpen(true)} />
          </Suspense>
        )}
        {activeTab === 3 && (
          <Suspense fallback={<PanelLoading />}>
            <SynastryReport onOpenSettings={() => setIsAiModalOpen(true)} />
          </Suspense>
        )}
        {activeTab === 4 && (
          <Suspense fallback={<PanelLoading />}>
            <MbtiTest />
          </Suspense>
        )}

      </main>

      {/* AI 設定彈窗 */}
      <AiSettingsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* 頁尾版權與免責聲明 */}
      <footer className="mt-16 bg-stone-900 text-stone-400 text-xs py-8 border-t border-stone-800">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-2">
          <p className="text-stone-300 font-bold">易數神策 ‧ 易經梅花六爻排盤推斷系統</p>
          <p className="text-stone-500">
            本程式依據《易經》、《卜筮正宗》、《梅花易數》演算法構建，旨在提供人生哲思指引與人際溝通借鑑。
          </p>
          <p className="text-amber-500 font-bold">
            免責聲明：本站內容僅供娛樂與自我探索，不具科學效度，亦不構成醫療、投資、法律或心理諮商建議。
          </p>
          <p className="text-stone-600 font-sans text-[11px] pt-2">
            部署網址：https://den3do.github.io/ask5/ ‧ 純前端無伺服器架構
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DivinationApp;
