import React, { useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import BirthForm from './BirthForm';
import IchingPanel from './panels/IchingPanel';
import ZiweiPanel from './panels/ZiweiPanel';
import HdPanel from './panels/HdPanel';
import AstroPanel from './panels/AstroPanel';
import FusionPanel from './panels/FusionPanel';
import { DEFAULT_BIRTH, computeFullProfile } from '../utils/profile';

const SUBTABS = [
  { id: 'iching', label: '易經命卦', emoji: '☯️', C: IchingPanel },
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
          {Active && <Active profile={profile} onOpenSettings={onOpenSettings} />}
        </div>
      )}
    </div>
  );
}
