import React from 'react';

const TONE = {
  吉: 'bg-emerald-600 text-white',
  凶: 'bg-rose-600 text-white',
  中: 'bg-stone-400 text-white',
};

/** 特殊卦象（六合／六沖、反吟伏吟、三合局、暗動）白話說明卡 */
export default function SpecialPatterns({ patterns }) {
  if (!patterns?.length) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/70 p-3 text-xs text-stone-500 font-sans">
        特殊卦象：本卦沒有六合、六沖、反吟、伏吟、三合局或暗動。
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 font-sans space-y-3">
      <div className="font-bold text-sm text-stone-800">🔍 特殊卦象（白話說明）</div>
      {patterns.map((p) => (
        <div key={p.key} className="text-xs text-stone-700 leading-relaxed">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[p.tone]}`}>{p.tone === '中' ? '看情況' : p.tone}</span>
            <b className="text-stone-800">{p.name}</b>
          </div>
          <p className="mt-1">{p.plain}</p>
          <details className="mt-0.5 text-[11px] text-stone-500">
            <summary className="cursor-pointer">怎麼從盤上看出來？</summary>
            <p className="mt-0.5">{p.how}</p>
          </details>
        </div>
      ))}
    </div>
  );
}
