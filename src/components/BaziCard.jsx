import React from 'react';

const WX_BAR = { 木: 'bg-green-500', 火: 'bg-red-500', 土: 'bg-amber-600', 金: 'bg-slate-400', 水: 'bg-blue-500' };
const TONE = {
  good: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  mid: 'bg-stone-100 text-stone-700 border-stone-300',
  bad: 'bg-rose-100 text-rose-800 border-rose-300',
};
const TONE_LABEL = { good: '助力', mid: '平', bad: '阻力' };

/** 八字論命：日主強弱、格局、用神、大運與流年（子平扶抑法・簡化版） */
export default function BaziCard({ bazi }) {
  if (!bazi) return null;
  const { dayMaster, pillars, elements, strength, pattern, yongshen, luck, years, notes } = bazi;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow p-5 sm:p-6 space-y-5 font-sans text-stone-800">
      <header className="border-b border-stone-200 pb-3">
        <div className="text-xs text-stone-500 tracking-wider">八字論命（子平扶抑法・簡化版）</div>
        <h3 className="text-xl font-black mt-1">
          日主 {dayMaster.stem}{dayMaster.wx}（{dayMaster.yinyang}）・{strength.label}・{pattern.name}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          比劫＋印占 {strength.ratio}%，{strength.deLing ? '得令' : '不得令'}（月令 {strength.monthBranch}）。{pattern.note}
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border border-stone-200">
          <thead className="bg-stone-50">
            <tr>{pillars.map((p) => <th key={p.pos} className="py-1.5 border-b border-stone-200">{p.pos}</th>)}</tr>
          </thead>
          <tbody>
            <tr>{pillars.map((p) => <td key={p.pos} className="py-1 text-stone-500">{p.empty ? '—' : p.stemTen}</td>)}</tr>
            <tr>{pillars.map((p) => <td key={p.pos} className="py-1 text-2xl font-black">{p.empty ? '未明' : `${p.stem}${p.branch}`}</td>)}</tr>
            <tr>{pillars.map((p) => (
              <td key={p.pos} className="py-1.5 text-[11px] text-stone-600">
                {p.empty ? '' : p.hidden.map((h) => `${h.stem}${h.ten}`).join('・')}
              </td>
            ))}
            </tr>
          </tbody>
        </table>
        <p className="text-[11px] text-stone-400 mt-1">第一列為天干十神；第三列為地支藏干（本氣、中氣、餘氣）及其十神。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="font-bold text-sm mb-2">五行占比（天干＋藏干加權，月令最重）</div>
          <div className="space-y-1.5">
            {Object.entries(elements.pct).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-5 font-bold">{k}</span>
                <div className="flex-1 h-2.5 bg-stone-100 rounded"><div className={`h-full rounded ${WX_BAR[k]}`} style={{ width: `${v}%` }} /></div>
                <span className="w-9 text-right text-stone-600">{v}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs leading-6">
          <div className="font-bold text-sm mb-2">用神與喜忌</div>
          <p>用神：<b className="text-emerald-700">{yongshen.primary}</b>（{yongshen.primaryGroup}）</p>
          <p>喜：<b>{yongshen.favorable.join('、') || '—'}</b>　忌：<b className="text-rose-700">{yongshen.unfavorable.join('、') || '—'}</b></p>
          {yongshen.tiaohou && <p className="text-amber-700">{yongshen.tiaohou}</p>}
          <p className="text-stone-400 mt-1">{yongshen.method}</p>
        </div>
      </div>

      {luck && (
        <div>
          <div className="font-bold text-sm mb-1">大運（{luck.direction}）</div>
          <p className="text-xs text-stone-500 mb-2">{luck.note}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {luck.cycles.map((c) => (
              <div key={c.gz} className={`rounded-lg border p-2 text-center text-xs ${c.current ? 'ring-2 ring-amber-500' : ''} ${TONE[c.tone]}`}>
                <div className="text-lg font-black">{c.gz}</div>
                <div>{c.ageFrom}–{c.ageTo} 歲</div>
                <div className="text-[10px] opacity-80">{c.yearFrom}–{c.yearTo}</div>
                <div className="text-[10px]">{c.stemTen}／{c.branchTen}・{TONE_LABEL[c.tone]}</div>
                {c.current && <div className="text-[10px] font-bold">◀ 目前</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="font-bold text-sm mb-2">近五年流年</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {years.map((y) => (
            <div key={y.year} className={`rounded-lg border p-2 text-center text-xs ${TONE[y.tone]}`}>
              <div className="font-bold">{y.year}</div>
              <div className="text-lg font-black">{y.gz}</div>
              <div className="text-[10px]">{y.stemTen}／{y.branchTen}・{TONE_LABEL[y.tone]}</div>
              {y.flags.length > 0 && <div className="text-[10px] mt-0.5 font-bold">{y.flags.join('、')}</div>}
            </div>
          ))}
        </div>
      </div>

      <ul className="text-[11px] text-stone-500 space-y-0.5 list-disc pl-4">
        {notes.map((n, i) => <li key={i}>{n}</li>)}
      </ul>
    </div>
  );
}
