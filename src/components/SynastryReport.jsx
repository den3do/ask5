import React, { useMemo, useState } from 'react';
import { HeartHandshake, AlertCircle } from 'lucide-react';
import BirthForm from './BirthForm';
import SmartReading from './SmartReading';
import { Explainer } from './ui';

const ACCENT = {
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  purple: 'border-purple-300 bg-purple-50 text-purple-900',
  blue: 'border-sky-300 bg-sky-50 text-sky-900',
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-900',
};
import { DEFAULT_BIRTH, computeFullProfile, compareProfiles, generatePairPrompt } from '../utils/profile';

const DIM_ACCENT = { iching: 'amber', ziwei: 'purple', astro: 'blue', hd: 'emerald' };
const CLR_A = 'text-sky-700';
const CLR_B = 'text-rose-600';

/** 把文字中的兩人姓名上色（甲＝藍、乙＝玫瑰紅） */
function NameText({ text, nameA, nameB }) {
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = [nameA, nameB].sort((x, y) => y.length - x.length);
  const parts = String(text).split(new RegExp('(' + names.map(esc).join('|') + ')', 'g'));
  return parts.map((t, i) => (t === nameA ? <b key={i} className={CLR_A}>{t}</b> : t === nameB ? <b key={i} className={CLR_B}>{t}</b> : <React.Fragment key={i}>{t}</React.Fragment>));
}

const TONE = { good: 'text-emerald-700', warn: 'text-amber-700' };

function ChannelList({ title, hint, items, tone, nameA, nameB }) {
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="font-bold text-xs">{title}（{items.length}）</div>
      <div className="text-[11px] opacity-75 mb-1">{hint}</div>
      {items.length === 0 ? <div className="text-[11px] opacity-60">無</div> : (
        <ul className="text-xs space-y-0.5">
          {items.map((c) => <li key={c.gates.join('-')}>G{c.gates[0]}–G{c.gates[1]} {c.name}<span className="opacity-70">｜<NameText text={c.who} nameA={nameA} nameB={nameB} /></span></li>)}
        </ul>
      )}
    </div>
  );
}

/** 4.2 太極同心・雙人全維合盤 */
export default function SynastryReport({ onOpenSettings }) {
  const [a, setA] = useState({ ...DEFAULT_BIRTH, name: '', year: '1995', month: '5', day: '20', hour: '10' });
  const [b, setB] = useState({ ...DEFAULT_BIRTH, name: '', gender: '女', year: '1996', month: '9', day: '18', hour: '19' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = () => {
    try {
      let nameA = (a.name || '').trim() || '甲方';
      let nameB = (b.name || '').trim() || '乙方';
      if (nameA === nameB) { nameA += '（一）'; nameB += '（二）'; }
      const pA = computeFullProfile({ ...a, name: nameA });
      const pB = computeFullProfile({ ...b, name: nameB });
      setResult({ pA, pB, cmp: compareProfiles(pA, pB) });
      setError('');
    } catch (e) {
      setResult(null);
      setError(e.message || String(e));
    }
  };

  const prompt = useMemo(() => (result ? generatePairPrompt(result.pA, result.pB, result.cmp) : ''), [result]);
  const cmp = result?.cmp;
  const nA = result?.pA.name;
  const nB = result?.pB.name;

  return (
    <div className="space-y-6 animate-fadeIn">
      <Explainer title="雙人合盤怎麼看？" accent="rose">
        <p>輸入兩人的生辰，同時用四個系統評估：<b>易經</b>看兩人世爻五行的生剋，<b>紫微</b>看命宮與夫妻宮的互照，<b>占星</b>看日月金火的跨盤相位（靈魂共鳴、情感溝通、吸引力），<b>人類圖</b>看通道如何互補。</p>
        <p>人類圖的「電磁」是各持通道一端、相遇產生強烈吸引；「同伴」是兩人都有完整通道、默契相近；「妥協」是一人完整、另一人只有一端，需要磨合。</p>
        <p>分數是本站自訂的啟發式估算，請當作「相處觀察重點」，而不是對關係的判決。</p>
      </Explainer>

      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-4 py-3 text-xs font-sans">
        ⚠ 下方預填的是<b>範例生辰</b>，不是你們的資料。請先改成真實的出生日期、時間與地點，再按「計算四維合盤」。
      </div>
      <div className="border-l-4 border-sky-500 pl-3"><BirthForm title={`${(a.name || '').trim() || '甲方'} 的生辰（藍）`} value={a} onChange={setA} /></div>
      <div className="border-l-4 border-rose-500 pl-3"><BirthForm title={`${(b.name || '').trim() || '乙方'} 的生辰（紅）`} value={b} onChange={setB} /></div>

      <div className="flex justify-end">
        <button type="button" onClick={run} className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-8 py-3 rounded-lg text-sm shadow-md flex items-center gap-2 font-sans">
          <HeartHandshake className="w-4 h-4" />計算四維合盤
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm font-sans">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {cmp && (
        <div className="space-y-6 font-sans">
          <div className="bg-stone-900 text-white rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-lg">
            <div className="text-center">
              <div className="text-xs text-stone-400">綜合傾向（規則式相對評估）</div>
              <div className="text-4xl font-black text-amber-400">{cmp.levelLabel}</div>
              <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold">{cmp.tier}</div>
            </div>
            <div className="flex-1 w-full space-y-2">
              <p className="text-sm text-stone-300">{cmp.desc}</p>
              {cmp.dims.map((d) => (
                <div key={d.key} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-stone-300">{d.label}</span>
                  <div className="flex-1 flex gap-1">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={`h-2 flex-1 rounded ${n <= d.level ? 'bg-amber-500' : 'bg-stone-700'}`} />)}</div>
                  <span className="w-16 text-right">{d.levelLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`rounded-xl border p-4 ${ACCENT[DIM_ACCENT.iching]} md:col-span-2`}>
              <div className="font-bold text-sm mb-1">八字合婚：日干・日支（夫妻宮）・生肖・喜用互補</div>
              {cmp.bazi.notes.length === 0 ? <p className="text-xs">日柱、生肖無明顯合沖，互動以其他體系為主。</p> : (
                <ul className="text-xs space-y-1 leading-relaxed">
                  {cmp.bazi.notes.map((n, i) => <li key={i} className={TONE[n.tone]}>・<NameText text={n.text} nameA={nA} nameB={nB} /></li>)}
                </ul>
              )}
            </div>
            <div className={`rounded-xl border p-4 ${ACCENT[DIM_ACCENT.iching]}`}>
              <div className="font-bold text-sm mb-1">易經：世應五行（{cmp.iching.tier}）</div>
              <p className="text-xs leading-relaxed"><NameText text={cmp.iching.dynamicSummary} nameA={nA} nameB={nB} /></p>
              {(cmp.iching.goldenRules?.length > 0) && (
                <ul className="text-xs mt-2 space-y-0.5 list-disc pl-4">
                  {cmp.iching.goldenRules.map((g, i) => <li key={i}><NameText text={g} nameA={nA} nameB={nB} /></li>)}
                </ul>
              )}
            </div>

            <div className={`rounded-xl border p-4 ${ACCENT[DIM_ACCENT.ziwei]}`}>
              <div className="font-bold text-sm mb-1">紫微：命宮・夫妻宮互照</div>
              {cmp.ziwei.notes.length === 0 ? <p className="text-xs">兩盤無特別呼應或衝突。</p> : (
                <ul className="text-xs space-y-1 leading-relaxed">
                  {cmp.ziwei.notes.map((n, i) => <li key={i} className={TONE[n.tone]}>・<NameText text={n.text} nameA={nA} nameB={nB} /></li>)}
                </ul>
              )}
            </div>

            <div className={`rounded-xl border p-4 ${ACCENT[DIM_ACCENT.astro]}`}>
              <div className="font-bold text-sm mb-1">占星：日月金火跨盤相位</div>
              <div className="text-[11px] mb-2 opacity-80">
                {Object.entries(cmp.astro.themeScore).map(([k, v]) => `${k}：${['', '張力較大', '需要磨合', '互補成長', '默契良好', '高度共鳴'][v >= 85 ? 5 : v >= 75 ? 4 : v >= 65 ? 3 : v >= 55 ? 2 : 1]}`).join('　')}
              </div>
              <ul className="text-xs space-y-0.5 max-h-48 overflow-y-auto">
                {cmp.astro.aspects.length === 0 && <li>無明顯跨盤相位</li>}
                {cmp.astro.aspects.slice(0, 12).map((x) => (
                  <li key={`${x.a}-${x.b}`} className={x.tone === 'tension' ? 'text-amber-700' : x.tone === 'harmonious' ? 'text-emerald-700' : ''}>
                    <b className={CLR_A}>{nA}</b>{x.labelA} {x.symbol} <b className={CLR_B}>{nB}</b>{x.labelB}（{x.name}，{x.orb.toFixed(1)}°）
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-xl border p-4 ${ACCENT[DIM_ACCENT.hd]}`}>
              <div className="font-bold text-sm mb-2">
                人類圖：<span className={CLR_A}>{nA}</span> {result.pA.hd.typeInfo.type} × <span className={CLR_B}>{nB}</span> {result.pB.hd.typeInfo.type}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <ChannelList title="電磁通道・致命火花" hint="各持一端，相遇即強烈吸引" items={cmp.hd.electromagnetic} tone="border-rose-200 bg-white/70" nameA={nA} nameB={nB} />
                <ChannelList title="同伴通道・長久默契" hint="兩人皆有完整通道" items={cmp.hd.companion} tone="border-emerald-200 bg-white/70" nameA={nA} nameB={nB} />
                <ChannelList title="妥協通道・磨擦盲點" hint="一人完整、另一人只有一端" items={cmp.hd.compromise} tone="border-amber-200 bg-white/70" nameA={nA} nameB={nB} />
                <ChannelList title="支配通道" hint="一人完整、另一人兩端皆無" items={cmp.hd.dominance} tone="border-stone-200 bg-white/70" nameA={nA} nameB={nB} />
              </div>
            </div>
          </div>

          <SmartReading systemKey="pair" title="智慧相命" prompt={prompt} onOpenSettings={onOpenSettings} />
        </div>
      )}
    </div>
  );
}
