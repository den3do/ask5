import React, { useMemo, useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';
import { SectionTitle } from './ui';
import SmartReading from './SmartReading';
import WeixinCast from './WeixinCast';
import { BRANCHES } from '../data/constants';
import { buildWeixinLiunian, weixinLiunianText, defaultLiunianYear } from '../utils/weixinLiunian';
import { baziYearOf } from '../utils/lunar';

const LEVEL_CLS = {
  吉: 'bg-emerald-600 text-white',
  小吉: 'bg-emerald-100 text-emerald-800',
  平: 'bg-stone-200 text-stone-700',
  小凶: 'bg-rose-100 text-rose-800',
  凶: 'bg-rose-600 text-white',
};
const CARD_CLS = {
  吉: 'border-emerald-300 bg-emerald-50/60',
  小吉: 'border-emerald-200 bg-white',
  平: 'border-stone-200 bg-white',
  小凶: 'border-rose-200 bg-white',
  凶: 'border-rose-300 bg-rose-50/60',
};
const md = (d) => { const t = new Date(d.getTime() + 8 * 3600000); return `${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };

function buildPrompt(profile, hexName, r) {
  return `請以唯心宗命卦專家的視角，為命主【${profile.name}】（${profile.gender}）批 ${r.year} ${r.gz}年（${r.zodiac}年）流年。命卦：${hexName}；世爻 ${r.shi.branch}${r.shi.wuxing}（${r.shi.relation}持世）。
以下為系統依「命卦世爻、上下卦 × 太歲、月建 的五行生剋沖合」算出的結果（本站整合法，請據此論述，不要杜撰其他神煞）：

【全年】${r.yearLevel}
${r.yearNotes.map((n) => `- ${n}`).join('\n')}
- ${r.yearTheme.stem}
- ${r.yearTheme.branch}
${r.taisui.length ? `- 生肖太歲：${r.taisui.join('、')}\n` : ''}
【逐月（節氣月）】
${r.months.map((m) => `- ${m.lunarName} ${m.gz}（${md(m.from)}起）：${m.level}；世爻${m.shiStatus}；外運：${m.outer.text}；內運：${m.inner.text}；主題：${m.relation}（${m.theme}）${m.notes.length > 1 ? `；${m.notes.slice(1).join('；')}` : ''}`).join('\n')}

請依序撰寫：
1. 【全年總論】以「內明外順」的角度說明這一年的整體氣勢與修心重點。
2. 【逐月提點】十二個月各用兩三句話說明宜與忌。
3. 【把握與謹慎】最值得把握與最需謹慎的月份，以及具體做法。
4. 【新年心法】一句話送給命主。
語氣溫和、不恐嚇，註明是傾向參考。`;
}

/** 唯心宗命卦 × 流年／流月 吉凶 */
export default function WeixinLiunian({ profile, chart, upId, loId, hexName, systemPrompt, onOpenSettings }) {
  const [year, setYear] = useState(() => defaultLiunianYear());
  const [copied, setCopied] = useState(false);
  const thisYear = baziYearOf();
  const ly = profile.destiny?.lunar?.year;
  const birthBranch = ly ? BRANCHES[(((ly - 4) % 12) + 12) % 12] : null;
  const valid = Number.isInteger(year) && year >= 1901 && year <= 2099;

  const r = useMemo(() => (valid
    ? buildWeixinLiunian({ lines: chart.lines, palace: chart.palace, upId, loId, year, gender: profile.gender, birthBranch })
    : null), [chart, upId, loId, year, profile.gender, birthBranch, valid]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(weixinLiunianText(profile.name, hexName, r));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* 剪貼簿不可用時不處理 */ }
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub="先選年份；上方是唯心宗的立春卜卦，下方是本命卦直接對照太歲與月建">流年・流月</SectionTitle>

      <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
        <label className="flex items-center gap-2 text-stone-600">
          要看的年份
          <input
            type="number"
            min={1901}
            max={2099}
            value={Number.isNaN(year) ? '' : year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="w-24 border border-stone-300 rounded-lg px-2 py-1.5 bg-white text-stone-800"
          />
        </label>
        {[thisYear, thisYear + 1].map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            aria-pressed={year === y}
            className={`px-3 py-1.5 rounded-full border font-bold ${year === y ? 'bg-stone-900 text-amber-300 border-amber-500' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'}`}
          >
            {y === thisYear ? '今年' : '明年'} {y}
          </button>
        ))}
        {r && (
          <button type="button" onClick={copy} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:border-stone-500 font-bold text-stone-700">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已複製' : '複製流年表（文字）'}
          </button>
        )}
      </div>
      {!valid && <p className="text-xs text-rose-700 font-sans">請輸入 1901–2099 之間的年份。</p>}

      {valid && <WeixinCast profile={profile} year={year} systemPrompt={systemPrompt} onOpenSettings={onOpenSettings} />}

      {r && (
        <>
          <div className="pt-2 font-sans">
            <div className="font-black text-base text-stone-800">📐 命卦對照流年（本站整合法）</div>
            <p className="text-xs text-stone-500 mt-0.5">不用起卦：直接拿本命卦的世爻與上下卦，對照太歲與每月月建。</p>
          </div>
          <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 font-sans text-xs text-stone-700 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-lg text-stone-800">{r.year} {r.gz}年（{r.zodiac}年）</span>
              <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${LEVEL_CLS[r.yearLevel]}`}>全年 {r.yearLevel}</span>
              <span className="text-stone-500">命卦 {hexName}・世爻 {r.shi.branch}{r.shi.wuxing}（{r.shi.relation}持世）</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              {r.yearNotes.map((n, i) => <li key={i}>{n}</li>)}
              <li>{r.yearTheme.stem}</li>
              <li>{r.yearTheme.branch}</li>
            </ul>
            {r.taisui.length > 0 && (
              <p className="text-amber-800 font-bold">⚠ 生肖太歲：{r.taisui.join('、')}（民俗提醒，宜低調、多行善）</p>
            )}
            <p>
              較順月份：<b className="text-emerald-700">{r.best.join('、')}</b>　宜謹慎月份：<b className="text-rose-700">{r.worst.join('、')}</b>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-sans">
            {r.months.map((m) => (
              <div key={m.idx} className={`rounded-xl border p-3 shadow-sm text-xs text-stone-700 ${CARD_CLS[m.level]}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-stone-800">{m.lunarName}</span>
                    <span className="ml-1.5 font-black">{m.gz}</span>
                    <span className="ml-1.5 text-stone-400">{md(m.from)}–{md(new Date(m.to.getTime() - 86400000))}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 font-bold ${LEVEL_CLS[m.level]}`}>{m.level}</span>
                </div>
                <div className="mt-1.5">主題：<b>{m.relation}</b>・{m.theme}</div>
                <div className="mt-0.5">{m.advice}</div>
                <details className="mt-1.5 text-[11px] text-stone-500">
                  <summary className="cursor-pointer">判斷依據（世爻{m.shiStatus}）</summary>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {m.notes.map((n, i) => <li key={i}>{n}</li>)}
                    <li>外運（上卦）：{m.outer.text}</li>
                    <li>內運（下卦）：{m.inner.text}</li>
                  </ul>
                </details>
              </div>
            ))}
          </div>

          <ul className="text-[11px] text-stone-500 space-y-0.5 list-disc pl-4 font-sans">
            {r.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>

          <SmartReading
            systemKey="weixin"
            title={`AI 流年批命 ‧ ${r.year}`}
            prompt={buildPrompt(profile, hexName, r)}
            systemPrompt={systemPrompt}
            onOpenSettings={onOpenSettings}
          />
        </>
      )}
    </div>
  );
}
