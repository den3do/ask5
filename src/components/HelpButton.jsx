import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, X } from 'lucide-react';

// 說明內容放在 src/data/help/*.js，點開才載入，不拖慢首屏
const LOADERS = {
  divination: () => import('../data/help/divination.js'),
  personal: () => import('../data/help/personal.js'),
  iching: () => import('../data/help/iching.js'),
  weixin: () => import('../data/help/weixin.js'),
  ziwei: () => import('../data/help/ziwei.js'),
  hd: () => import('../data/help/hd.js'),
  astro: () => import('../data/help/astro.js'),
  fusion: () => import('../data/help/fusion.js'),
  synastry: () => import('../data/help/synastry.js'),
  mbti: () => import('../data/help/mbti.js'),
};

/** 只支援 **粗體** 一種行內標記 */
function Rich({ text }) {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 ? <strong key={i} className="text-stone-900">{p}</strong> : <React.Fragment key={i}>{p}</React.Fragment>));
}

function Block({ b }) {
  switch (b.type) {
    case 'p':
      return <p className="leading-relaxed"><Rich text={b.text} /></p>;
    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1 leading-relaxed">
          {b.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}
        </ul>
      );
    case 'steps':
      return (
        <ol className="list-decimal pl-5 space-y-1 leading-relaxed marker:font-bold marker:text-amber-700">
          {b.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}
        </ol>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-100 text-stone-600">
              <tr>{b.head.map((h, i) => <th key={i} className="px-3 py-2 font-bold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {b.rows.map((row, i) => (
                <tr key={i} className="align-top">
                  {row.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j === 0 ? 'font-bold text-stone-800' : ''}`}><Rich text={c} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return (
        <div className={`rounded-lg border-l-4 px-3 py-2 leading-relaxed ${b.tone === 'warn' ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-amber-500 bg-amber-50 text-amber-950'}`}>
          <Rich text={b.text} />
        </div>
      );
    default:
      return null;
  }
}

function HelpModal({ topic, onClose }) {
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const bodyRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = LOADERS[topic];
    if (!load) { setError('找不到這一頁的說明。'); return undefined; }
    load().then((m) => { if (alive) setDoc(m.default); }).catch(() => { if (alive) setError('說明載入失敗，請重新整理頁面再試一次。'); });
    return () => { alive = false; };
  }, [topic]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const jump = (i) => bodyRef.current?.querySelector(`[data-sec="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={doc?.title || '說明'}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col font-sans text-stone-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-600" />{doc?.title || '說明'}
            </h2>
            {doc?.summary && <p className="text-xs text-stone-500 mt-1 leading-relaxed"><Rich text={doc.summary} /></p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="關閉說明" className="shrink-0 p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {doc && doc.sections.length > 3 && (
          <nav aria-label="說明目錄" className="px-5 py-2 border-b border-stone-100 flex gap-1.5 overflow-x-auto">
            {doc.sections.map((s, i) => (
              <button key={i} type="button" onClick={() => jump(i)} className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-stone-200 text-stone-600 hover:border-amber-500 hover:text-amber-800">
                {s.heading}
              </button>
            ))}
          </nav>
        )}

        <div ref={bodyRef} className="overflow-y-auto px-5 py-4 space-y-6 text-sm">
          {error && <p className="text-rose-700">{error}</p>}
          {!doc && !error && <p className="text-stone-500">說明載入中…</p>}
          {doc?.sections.map((s, i) => (
            <section key={i} data-sec={i} className="space-y-2.5 scroll-mt-2">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <span className="inline-block w-1 h-5 rounded bg-amber-500" />{s.heading}
              </h3>
              {s.blocks.map((b, j) => <Block key={j} b={b} />)}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 每個頁籤共用的「說明」按鈕：點開後顯示該頁的判斷邏輯與使用說明 */
export default function HelpButton({ topic, label = '說明', className = '' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500 bg-white text-amber-800 text-xs font-bold shadow-sm hover:bg-amber-50 font-sans ${className}`}
      >
        <BookOpen className="w-3.5 h-3.5" />{label}
      </button>
      {open && <HelpModal topic={topic} onClose={close} />}
    </>
  );
}
