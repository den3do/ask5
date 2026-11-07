import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

/** 可收合的「這是什麼？怎麼看？」說明卡 */
export function Explainer({ title = '這張圖怎麼看？', accent = 'amber', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = {
    amber: 'border-amber-300 bg-amber-50 text-amber-950',
    purple: 'border-purple-300 bg-purple-50 text-purple-950',
    sky: 'border-sky-300 bg-sky-50 text-sky-950',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-300 bg-rose-50 text-rose-950',
  }[accent];
  return (
    <div className={`rounded-xl border ${tone} font-sans`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-bold"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2"><Info className="w-4 h-4" />{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-3 text-xs leading-relaxed space-y-1.5">{children}</div>}
    </div>
  );
}

/** 深色舞台：給以深色設計的圖表元件使用 */
export function DarkStage({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 sm:p-6 text-slate-200 shadow-xl border border-slate-800 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-extrabold text-stone-800 tracking-wide flex items-center gap-2">
        <span className="inline-block w-1 h-5 rounded bg-amber-500" />{children}
      </h3>
      {sub && <p className="text-xs text-stone-500 mt-0.5 font-sans">{sub}</p>}
    </div>
  );
}
