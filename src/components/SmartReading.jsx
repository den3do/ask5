import React, { useState } from 'react';
import { Bot, KeyRound } from 'lucide-react';
import AiAnalysisSection from './AiAnalysisSection';
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

const FUSION_SYSTEM = `你同時扮演三位專家並依序發言：「武當老道」（道家哲理、古風白話、修身養性）、「心理學專家」（溫暖理性、以心理學概念解讀、聲明命理系統僅為自我探索工具）、「占卜大師」（篤定有人情味、趨勢與時機）。三位各自以自己的口吻與專業判斷，最後由你彙整成「三師會診」的融合結論。不恐嚇、不對醫療投資法律作保證，一律使用繁體中文。`;

/**
 * 智慧相命：有 API Key 才顯示 AI 解讀；沒有 Key 只顯示一行提示。
 * @param {string} systemKey iching | ziwei | astro | hd | fusion
 * @param {string} prompt    資料與問題（不含角色設定）
 */
export default function SmartReading({ systemKey, prompt, onOpenSettings, title = '智慧相命' }) {
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA[systemKey] || 'diviner');
  let hasKey = false;
  try {
    hasKey = Boolean(getAiConfig().activeKey);
  } catch {
    hasKey = false;
  }

  if (!hasKey) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white/60 hover:bg-white px-4 py-3 text-xs text-stone-500 hover:text-stone-700 font-sans transition"
      >
        <KeyRound className="w-4 h-4" />
        設定 Gemini 或 OpenRouter 的 API Key 後，這裡會出現「智慧相命」AI 深度解讀
      </button>
    );
  }

  const isFusion = systemKey === 'fusion';
  const persona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0];
  const finalPrompt = isFusion ? prompt : `【角色指定】請${persona.voice}回答，並以此覆蓋下方提示中對你身分的任何描述。\n\n${prompt}`;

  return (
    <div className="space-y-3">
      {!isFusion && (
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
      )}
      <AiAnalysisSection
        title={isFusion ? `${title} ‧ 三師會診` : `${title} ‧ ${persona.name}`}
        prompt={finalPrompt}
        systemPrompt={isFusion ? FUSION_SYSTEM : persona.system}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
