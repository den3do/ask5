import React, { useState } from 'react';
import { Bot, KeyRound } from 'lucide-react';
import AiAnalysisSection from './AiAnalysisSection';
import CopyPromptButton from './CopyPromptButton';
import { getAiConfig } from '../utils/aiService';

/** 三位解讀角色 */
export const PERSONAS = [
  {
    id: 'wudang', name: '武當老道', emoji: '☯️', tagline: '道家哲理・修身養性',
    system: '你是武當山修行七十餘年的老道長，精通易經、六爻、紫微斗數與道家養生。語氣沉穩，帶道家哲理與古風白話，善用比喻與典故，但仍要給出具體可行的建議。不恐嚇、不鐵口直斷生死或災禍，凡事以「順勢而為、修身積德」收尾。一律使用繁體中文。',
    voice: '以武當老道的身分與口吻（道家哲理、古風白話、養生修身）',
  },
  {
    id: 'psych', name: '心理學專家', emoji: '🧠', tagline: '自我探索・行為洞察',
    system: '你是資深的心理學專家（取向包含榮格分析心理學與現代諮商），熟悉占星心理學與人類圖作為自我探索的象徵語言。語氣溫暖、理性、不評判，善用心理學概念（核心信念、需求、依附風格、防衛機制、陰影、投射）解讀，並明確告知這些系統是自我探索的隱喻工具，不是科學診斷。請給出可練習的具體行動。一律使用繁體中文。',
    voice: '以心理學專家的身分與口吻（溫暖理性、心理學概念、可練習的行動）',
  },
  {
    id: 'diviner', name: '占卜大師', emoji: '🔮', tagline: '綜合斷語・趨勢指引',
    system: '你是閱歷豐富的占卜大師，擅長綜合多個命理體系做斷語。語氣篤定而有人情味，會點出機會、時機與提醒，但保持分寸，不對醫療、投資、法律作保證，也不使用恐嚇語。結論要具體、有結構、有行動建議。一律使用繁體中文。',
    voice: '以占卜大師的身分與口吻（篤定有人情味、趨勢與時機、具體斷語）',
  },
];

/** 各系統預設的角色 */
export const DEFAULT_PERSONA = { iching: 'wudang', ziwei: 'diviner', astro: 'psych', hd: 'psych' };

const FUSION_SYSTEM = `你是精通紫微斗數、人類圖與西洋占星心理學的整合型解讀者。任務是把三套系統「融合」而非逐一羅列：找出多家共同指向的主題、說明彼此矛盾之處與整合方式，並用流暢、溫暖、白話的繁體中文重新組織成一篇有主軸的總論。聲明這些系統是自我探索的象徵工具，不是科學診斷；不恐嚇、不鐵口直斷吉凶、不對醫療投資法律作保證。`;

/**
 * 智慧相命：有 API Key 才顯示 AI 解讀；沒有 Key 只顯示一行提示。
 * @param {string} systemKey iching | ziwei | astro | hd | fusion
 * @param {string} prompt    資料與問題（不含角色設定）
 */
export default function SmartReading({ systemKey, prompt, onOpenSettings, title = '智慧相命', systemPrompt }) {
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA[systemKey] || 'diviner');
  let hasKey = false;
  try {
    hasKey = Boolean(getAiConfig().activeKey);
  } catch {
    hasKey = false;
  }

  const isFusion = systemKey === 'fusion';
  const persona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0];
  const finalPrompt = isFusion || systemPrompt ? prompt : `【角色指定】請${persona.voice}回答，並以此覆蓋下方提示中對你身分的任何描述。

${prompt}`;
  const sysText = systemPrompt || (isFusion ? FUSION_SYSTEM : persona.system);
  const picker = !isFusion && !systemPrompt && (
    <div className="flex flex-wrap items-center gap-2 font-sans">
      <span className="flex items-center gap-1 text-xs font-bold text-stone-600"><Bot className="w-4 h-4" />解讀角色</span>
      {PERSONAS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPersonaId(p.id)}
          aria-pressed={personaId === p.id}
          className={`px-3 py-1.5 rounded-full border text-xs font-bold transition ${
            personaId === p.id
              ? 'bg-stone-900 text-amber-300 border-amber-500 shadow'
              : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
          }`}
          title={p.tagline}
        >
          {p.emoji} {p.name}
        </button>
      ))}
      <span className="text-[11px] text-stone-400">{persona.tagline}</span>
    </div>
  );

  if (!hasKey) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/70 p-4 font-sans text-xs text-stone-600 leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-bold text-stone-800 text-sm">
          <Bot className="w-4 h-4" />{title}（選用功能）
        </div>
        <p>
          上面的排盤與斷語不需要任何設定就能使用。若想再讓 AI 用白話幫你深入解讀，可以貼上自己的 AI 金鑰（Google Gemini 有免費額度，
          到 Google AI Studio 約 1 分鐘可取得）。不想設定也沒關係，可直接按下方「一鍵複製 AI 提示詞」貼到 ChatGPT、Claude 等你熟悉的 AI。
        </p>
        {picker}
        <div className="flex flex-wrap gap-2">
          <CopyPromptButton systemPrompt={sysText} prompt={finalPrompt} />
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-amber-300 font-bold hover:bg-stone-800"
        >
          <KeyRound className="w-3.5 h-3.5" />設定 AI 金鑰
        </button>
      </div>
    );
  }

  // 自帶專屬角色（如唯心宗）：不顯示角色切換
  if (systemPrompt) {
    return <AiAnalysisSection title={title} prompt={prompt} systemPrompt={systemPrompt} onOpenSettings={onOpenSettings} />;
  }

  return (
    <div className="space-y-3">
      {picker}
      <AiAnalysisSection
        title={isFusion ? `${title} ‧ 三師會診` : `${title} ‧ ${persona.name}`}
        prompt={finalPrompt}
        systemPrompt={isFusion ? FUSION_SYSTEM : persona.system}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
