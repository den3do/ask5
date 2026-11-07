import React, { useState, Suspense, lazy } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import BirthForm from './BirthForm';
import { DEFAULT_BIRTH, computeFullProfile } from '../utils/profile';

// 面板背後掛著重型引擎（iztro 紫微、astronomy-engine 占星），改為點到哪個分頁才載入，避免拖慢首屏
const IchingPanel = lazy(() => import('./panels/IchingPanel'));
const WeixinPanel = lazy(() => import('./panels/WeixinPanel'));
const ZiweiPanel = lazy(() => import('./panels/ZiweiPanel'));
const HdPanel = lazy(() => import('./panels/HdPanel'));
const AstroPanel = lazy(() => import('./panels/AstroPanel'));
const FusionPanel = lazy(() => import('./panels/FusionPanel'));

const SUBTABS = [
  { id: 'iching', label: '易經命卦', emoji: '☯️', C: IchingPanel },
  { id: 'weixin', label: '唯心宗', emoji: '🧘', C: WeixinPanel },
  { id: 'ziwei', label: '紫微斗數', emoji: '🌌', C: ZiweiPanel },
  { id: 'hd', label: '人類圖', emoji: '⬡', C: HdPanel },
  { id: 'astro', label: '西洋星座', emoji: '🪐', C: AstroPanel },
  { id: 'fusion', label: '融合', emoji: '🌐', C: FusionPanel },
];

/** 個人命理：輸入一次生辰，分頁檢視四大系統與融合報告 */
export default function PersonalHub({ onOpenSettings }) {
  const [birth, setBirth] = useState({ ...DEFAULT_BIRTH, name: '命主' });
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [sub, setSub] = useState('iching');

  const run = () => {
    try {
      setProfile(computeFullProfile(birth));
      setError('');
    } catch (e) {
      setProfile(null);
      setError(e.message || String(e));
    }
  };

  const Active = SUBTABS.find((t) => t.id === sub)?.C;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-4 py-3 text-xs font-sans">
        ⚠ 目前預填的是<b>範例生辰</b>，不是你的資料。請改成你的出生日期、時間與地點，再按「排出命盤」。
      </div>
      <BirthForm title="個人生辰（輸入一次，四大系統共用）" value={birth} onChange={setBirth} />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={run}
          className="bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-600 font-bold px-8 py-3 rounded-lg text-sm shadow-md flex items-center gap-2 font-sans"
        >
          <Sparkles className="w-4 h-4" />排出命盤
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm font-sans">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {profile && (
        <div className="space-y-5">
          {profile.warnings?.length > 0 && (
            <div role="note" className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs font-sans space-y-1">
              <div className="font-bold">排盤提醒（影響準確度的條件）</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {profile.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          <details className="text-[11px] text-stone-500 font-sans">
            <summary className="cursor-pointer">本次排盤採用的約定（流派與時間換算）</summary>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {profile.conventions.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </details>
          <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-stone-100/95 backdrop-blur border-b border-stone-200">
            <div role="tablist" aria-label="命理系統" className="flex gap-1.5 overflow-x-auto pb-0.5 font-sans">
              {SUBTABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={sub === t.id}
                  onClick={() => setSub(t.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition ${
                    sub === t.id
                      ? 'bg-stone-900 text-amber-300 border-amber-500 shadow'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          {Active && (
            <Suspense fallback={<div className="p-8 text-center text-sm text-stone-500 font-sans">命盤載入中…</div>}>
              <Active profile={profile} onOpenSettings={onOpenSettings} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
