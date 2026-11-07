import React, { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

/**
 * 一鍵複製 AI 提示詞：讓使用者貼到 ChatGPT / Claude / Gemini 等自己熟悉的 AI。
 * @param {string} systemPrompt 角色設定（會放在最前面）
 * @param {string} prompt       排盤資料與問題
 */
export default function CopyPromptButton({ systemPrompt = '', prompt = '', className = '' }) {
  const [state, setState] = useState('idle'); // idle | ok | fail

  const handle = async () => {
    const text = [systemPrompt && `【角色設定】\n${systemPrompt}`, prompt].filter(Boolean).join('\n\n');
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      // 剪貼簿不可用時（例如非 https）改用隱藏 textarea
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        setState(ok ? 'ok' : 'fail');
      } catch {
        setState('fail');
      }
    }
    setTimeout(() => setState('idle'), 2500);
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={!prompt.trim()}
      className={`px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 shrink-0 ${className}`}
    >
      {state === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {state === 'ok' ? '已複製，可貼到 ChatGPT / Claude / Gemini' : state === 'fail' ? '無法自動複製，請手動選取' : '一鍵複製 AI 提示詞'}
    </button>
  );
}
