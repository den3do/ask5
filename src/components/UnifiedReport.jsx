import React, { useMemo, useState } from 'react';
import { Layers, AlertCircle } from 'lucide-react';
import BirthForm from './BirthForm';
import AiAnalysisSection from './AiAnalysisSection';
import { DEFAULT_BIRTH, computeFullProfile, generateUnifiedPrompt } from '../utils/profile';

export const ACCENT = {
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  purple: 'border-purple-300 bg-purple-50 text-purple-900',
  blue: 'border-sky-300 bg-sky-50 text-sky-900',
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-900',
};
const WX_BAR = { 木: 'bg-green-500', 火: 'bg-red-500', 土: 'bg-amber-600', 金: 'bg-slate-400', 水: 'bg-blue-500' };

/** 4.1 全象本命・個人人格深度報告 */
export default function UnifiedReport({ onOpenSettings }) {
  const [birth, setBirth] = useState({ ...DEFAULT_BIRTH, name: '命主' });
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const run = () => {
    try {
      setProfile(computeFullProfile(birth));
      setError('');
    } catch (e) {
      setProfile(null);
      setError(e.message || String(e));
    }
  };

  const prompt = useMemo(() => (profile ? generateUnifiedPrompt(profile) : ''), [profile]);
  const maxWx = profile ? Math.max(1, ...Object.values(profile.elements.tally)) : 1;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-lg text-sm leading-relaxed shadow-sm text-stone-800">
        <span className="font-bold text-rose-900">【全象本命】：</span>
        輸入一次生辰，同步排出易經命卦、紫微命盤、西洋星盤與人類圖，交叉對照後交由 AI 撰寫完整人格報告。
      </div>

      <BirthForm title="命主生辰（四大體系共用）" value={birth} onChange={setBirth} />

      <div className="flex justify-end">
        <button type="button" onClick={run} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8 py-3 rounded-lg text-sm shadow-md flex items-center gap-2 font-sans">
          <Layers className="w-4 h-4" />排出四維全象盤
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm font-sans">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
            {profile.cards.map((c) => (
              <div key={c.key} className={`rounded-xl border p-4 shadow-sm ${ACCENT[c.accent]}`}>
                <div className="text-xs opacity-70">{c.title}</div>
                <div className="text-lg font-black mt-0.5">{c.headline}</div>
                <ul className="mt-2 space-y-0.5 text-xs opacity-90">
                  {c.lines.map((l) => <li key={l}>・{l}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 font-sans shadow-sm">
            <h4 className="font-bold text-stone-800 text-sm mb-1">五行交叉分布（易經＋紫微＋占星估算）</h4>
            <p className="text-[11px] text-stone-500 mb-3">
              來源：{profile.elements.sources.join('、')}。占星以火→火、土→土、風→木、水→水對應，僅供參考。
            </p>
            <div className="space-y-1.5">
              {Object.entries(profile.elements.tally).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-4 font-bold">{k}</span>
                  <div className="flex-1 h-2.5 bg-stone-100 rounded">
                    <div className={`h-full rounded ${WX_BAR[k]}`} style={{ width: `${(v / maxWx) * 100}%` }} />
                  </div>
                  <span className="w-4 text-right text-stone-500">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-700 mt-3">
              偏重：{profile.elements.dominant.join('、') || '均衡'}　缺少：{profile.elements.missing.join('、') || '無'}
            </p>
          </div>

          <AiAnalysisSection
            title="全象本命 ‧ AI 四維人格深度報告"
            prompt={prompt}
            onOpenSettings={onOpenSettings}
          />
        </div>
      )}
    </div>
  );
}
