import React, { useMemo, useState } from 'react';
import { Explainer, SectionTitle } from '../ui';
import SmartReading from '../SmartReading';
import { baziToText } from '../../utils/bazi';
import { buildLiunianReading, generateLiunianPrompt } from '../../utils/liunian';

const TONE = {
  good: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  mid: 'bg-stone-50 text-stone-700 border-stone-300',
  bad: 'bg-rose-50 text-rose-800 border-rose-300',
};
const POSTURE_CLS = {
  積極: 'bg-emerald-600 text-white',
  穩進: 'bg-emerald-100 text-emerald-800',
  平穩: 'bg-stone-200 text-stone-700',
  保守: 'bg-rose-100 text-rose-800',
};

function Card({ icon, title, items, tone = 'border-stone-200 bg-white' }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm font-sans ${tone}`}>
      <div className="font-bold text-sm text-stone-800 mb-1.5 flex items-center gap-1.5"><span>{icon}</span>{title}</div>
      <ul className="text-xs text-stone-700 leading-relaxed space-y-1 list-disc pl-4">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}

/** 流年批命：八字流年（子平扶抑法・簡化）逐年批文＋AI 解讀 */
export default function LiunianPanel({ profile, onOpenSettings }) {
  const reading = useMemo(() => buildLiunianReading(profile), [profile]);
  const [sel, setSel] = useState(0);
  const y = reading.years[sel] || reading.years[0];
  const L = reading.luck;
  const prompt = useMemo(() => generateLiunianPrompt(profile, reading, baziToText(reading.bazi)), [profile, reading]);

  return (
    <div className="space-y-6">
      <Explainer title="「流年」怎麼批？" accent="emerald">
        <p>以八字為本：先算出命局的<b>喜用神與忌神</b>，再看每一年的干支落在哪裡。<b>天干</b>的十神代表當年外顯的主題（傳統說法主上半年），<b>地支</b>代表內在與下半年。</p>
        <p>流年地支若與出生四柱<b>沖、合、刑、害、破</b>，被觸動的那一柱代表的人事（年柱長輩、月柱工作、日柱自己與配偶、時柱子女部屬）就會有動靜。最後再放進所在的<b>十年大運</b>裡看整體基調。</p>
        <p>流年以<b>立春</b>換年，虛歲以農曆年計。這裡是規則式批文，傾向而非定論。</p>
      </Explainer>

      {L && (
        <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 font-sans text-xs text-stone-700 space-y-1.5">
          <div className="font-bold text-sm text-stone-800">🧭 大運背景（{L.direction}）</div>
          {L.current ? (
            <p>
              目前大運 <b className="text-base">{L.current.gz}</b>（{L.current.ageFrom}–{L.current.ageTo} 歲，{L.current.yearFrom}–{L.current.yearTo}）：
              天干{L.current.stemTen}、地支{L.current.branchTen}，整體<b>{L.current.toneLabel}</b>。
            </p>
          ) : <p>目前尚未起運（或已超過列出的九步大運）。</p>}
          {L.next && (
            <p>下一步大運 <b>{L.next.gz}</b>（{L.next.toneLabel}），約 {L.monthsToNext} 個月後交運。</p>
          )}
          <p className="text-stone-500">{L.note}</p>
        </div>
      )}

      <div>
        <SectionTitle sub="點選年份看詳批；顏色為流年喜忌，標籤為合看大運後的應對基調">十年流年一覽</SectionTitle>
        <div role="tablist" aria-label="流年" className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-sans">
          {reading.years.map((yr, i) => (
            <button
              key={yr.year}
              type="button"
              role="tab"
              aria-selected={sel === i}
              onClick={() => setSel(i)}
              className={`rounded-lg border p-2 text-center text-xs transition ${TONE[yr.tone]} ${sel === i ? 'ring-2 ring-amber-500 shadow' : 'hover:shadow'}`}
            >
              <div className="font-bold">{yr.year}{yr.current && <span className="ml-1 text-amber-700">今年</span>}</div>
              <div className="text-lg font-black">{yr.gz}</div>
              <div className="text-[10px]">{yr.stemTen}／{yr.branchTen}{yr.age ? `・${yr.age}歲` : ''}</div>
              <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${POSTURE_CLS[yr.posture]}`}>{yr.posture}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow p-5 sm:p-6 space-y-5 font-sans text-stone-800">
        <header className="border-b border-stone-200 pb-3">
          <div className="text-xs text-stone-500 tracking-wider">
            {y.year} 年流年詳批{y.age ? `・虛歲 ${y.age}` : ''}{y.luck ? `・大運 ${y.luck.gz}（${y.luck.toneLabel}）` : ''}
          </div>
          <h3 className="text-xl font-black mt-1 flex flex-wrap items-center gap-2">
            {y.gz}年・流年{y.toneLabel}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${POSTURE_CLS[y.posture]}`}>{y.posture}</span>
          </h3>
          <p className="text-sm text-stone-600 mt-1">{y.summary}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-xs leading-relaxed">
            <div className="font-bold text-sm mb-1">上半年・{y.stemTen}「{y.stemTheme.title}」</div>
            <p>{y.stemTheme.text}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-xs leading-relaxed">
            <div className="font-bold text-sm mb-1">下半年・{y.branchTen}「{y.branchTheme.title}」</div>
            <p>{y.branchTheme.text}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card icon="💼" title="事業" items={y.domains.career} />
          <Card icon="💰" title="財運" items={y.domains.wealth} />
          <Card icon="💞" title="感情" items={y.domains.love} />
          <Card icon="🫀" title="身心" items={y.domains.health} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card icon="✅" title="宜" items={y.do.length ? y.do : ['按部就班即可']} tone="border-emerald-200 bg-emerald-50/60" />
          <Card icon="⛔" title="忌" items={y.avoid.length ? y.avoid : ['沒有特別需要避開的事']} tone="border-rose-200 bg-rose-50/60" />
        </div>

        <details className="text-xs" open>
          <summary className="cursor-pointer font-bold text-sm">判斷依據</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-stone-700 leading-relaxed">
            {y.reasons.map((t, i) => <li key={`r${i}`}>{t}</li>)}
            {y.touched.map((t, i) => <li key={`t${i}`}>{t}</li>)}
            {y.specials.map((t, i) => <li key={`s${i}`} className="text-amber-800">{t}</li>)}
            {!y.touched.length && <li>流年地支與原局四柱沒有刑沖合害。</li>}
          </ul>
        </details>
      </div>

      <ul className="text-[11px] text-stone-500 space-y-0.5 list-disc pl-4 font-sans">
        {reading.notes.map((n, i) => <li key={i}>{n}</li>)}
      </ul>

      <SmartReading systemKey="liunian" title="AI 流年批命" prompt={prompt} onOpenSettings={onOpenSettings} />
    </div>
  );
}
