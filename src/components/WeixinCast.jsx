import React, { useMemo, useState } from 'react';
import { Dices, RotateCcw } from 'lucide-react';
import NajiaTable from './NajiaTable';
import SpecialPatterns from './SpecialPatterns';
import SmartReading from './SmartReading';
import { castLiunianGua } from '../utils/weixinLiunian';

const TOPICS = ['整體', '財運', '事業', '感情', '健康', '學業', '子女', '合夥'];
const LEVEL_CLS = {
  大吉: 'bg-emerald-700 text-white', 吉: 'bg-emerald-600 text-white', 小吉: 'bg-emerald-100 text-emerald-800', 平: 'bg-stone-200 text-stone-700',
  小凶: 'bg-rose-100 text-rose-800', 凶: 'bg-rose-600 text-white', 大凶: 'bg-rose-800 text-white',
};
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// 一年一卦：起過的卦存在本機，重開頁面仍看得到（讀寫失敗時就只存在畫面上）
const storeKey = (profile, year) => `weixin-cast:${profile.name}|${profile.birth.year}-${profile.birth.month}-${profile.birth.day}|${year}`;
function loadCast(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v && v.castAt ? v : null; } catch { return null; }
}
function saveCast(key, v) {
  try { if (v) localStorage.setItem(key, JSON.stringify(v)); else localStorage.removeItem(key); } catch { /* 無法儲存時略過 */ }
}

function buildPrompt(profile, r) {
  return `請以唯心宗易經專家的視角，為命主【${profile.name}】（${profile.gender}）解讀立春所卜的 ${r.year} ${r.gz}年流年卦。
【所問】${r.topic === '整體' ? '整體流年（以世爻論自己）' : `${r.topic}（${r.targetName}）`}
【起卦】${r.pillars.year}年 ${r.pillars.month}月 ${r.pillars.day}日 ${r.pillars.hour}時；旬空 ${r.pillars.kongWang.join('')}
【卦象】本卦 ${r.board.originalHex.name}（${r.palaceInfo.palaceName}宮${r.palaceInfo.palaceWuxing}）${r.board.moving ? `；${r.board.moving}爻動，變卦 ${r.board.changedHex.name}` : '；無動爻'}
【六爻】${[...r.linesData].reverse().map((l) => `${l.lineNum}爻${l.branch}${l.wuxing}(${l.relation}・${l.beast})${l.isShi ? '【世】' : ''}${l.isYing ? '【應】' : ''}${l.isMoving ? '【動】' : ''}`).join('、')}
【太歲】${r.taisui.branch}，於本卦為${r.taisui.relation}
【系統判斷】全年 ${r.yearLevel}
${r.yearNotes.map((n) => `- ${n}`).join('\n')}
${r.evaluation ? `- 一事一占引擎：${r.evaluation.level}；${r.evaluation.summary}\n` : ''}【逐月】${r.months.map((m) => `${m.lunarName}${m.gz}${m.level}`).join('、')}

請依「用神、元神、忌神、仇神」與太歲、月建論斷，依序寫：
1. 【全年總斷】太歲的六親與世爻關係代表的一年基調。
2. 【重點月份】應事之月與宜謹慎之月。
3. 【修持建議】以唯心宗「易經心法、妙法人間」的精神給出可實踐的做法。
不恐嚇、不鐵口直斷，註明是傾向參考。`;
}

/** 立春卜流年卦（唯心宗作法）：報三個數起六爻卦，看太歲六親、世爻與太歲、逐月月建 */
export default function WeixinCast({ profile, year, systemPrompt, onOpenSettings }) {
  const key = storeKey(profile, year);
  const [saved, setSaved] = useState(() => loadCast(key));
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) { setSeenKey(key); setSaved(loadCast(key)); }
  const [nums, setNums] = useState({ num1: '', num2: '', num3: '' });
  const [topic, setTopic] = useState('整體');
  const [castAtStr, setCastAtStr] = useState(() => toLocalInput(new Date()));
  const [error, setError] = useState('');

  const r = useMemo(() => (saved ? castLiunianGua({
    num1: saved.num1, num2: saved.num2, num3: saved.num3, castAt: new Date(saved.castAt), year, topic: saved.topic, gender: profile.gender,
  }) : null), [saved, year, profile.gender]);

  const cast = () => {
    const n = [nums.num1, nums.num2, nums.num3].map((v) => parseInt(v, 10));
    if (n.some((v) => Number.isNaN(v) || v < 1)) { setError('請填三個 1 以上的正整數（心中默念所問後，直覺報出的數字），或按「隨機」。'); return; }
    const at = new Date(castAtStr);
    if (Number.isNaN(at.getTime())) { setError('起卦時間格式不正確。'); return; }
    setError('');
    const v = { num1: n[0], num2: n[1], num3: n[2], castAt: at.toISOString(), topic };
    saveCast(key, v);
    setSaved(v);
  };
  const reset = () => { saveCast(key, null); setSaved(null); setCastAtStr(toLocalInput(new Date())); };
  const rand = () => { const g = () => String(1 + Math.floor(Math.random() * 99)); setNums({ num1: g(), num2: g(), num3: g() }); setError(''); };

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-white p-4 sm:p-5 space-y-4 font-sans text-stone-700">
      <div>
        <div className="font-black text-base text-stone-800">🪔 立春卜流年卦（唯心宗作法）</div>
        <p className="text-xs text-stone-500 mt-0.5">依唯心宗易經大學〈占卜流年吉凶〉：立春之後另起一卦，看太歲的六親與世爻和太歲的關係。</p>
      </div>

      {!r && (
        <>
          <ol className="list-decimal pl-5 text-xs leading-relaxed space-y-0.5">
            <li>在 {year} 年<b>立春之後</b>起卦，先靜心，誦《王禪老祖玄妙真經》一遍。</li>
            <li>心中默念：「弟子（姓名），卜問 {year} 年流年（或所問之事）」。</li>
            <li>直覺報出三個數字（上卦、下卦、動爻），按「起卦」。<b>一年一卦，不宜重複卜。</b></li>
          </ol>
          <div className="flex flex-wrap items-end gap-2 text-xs">
            {['num1', 'num2', 'num3'].map((k, i) => (
              <label key={k} className="flex flex-col gap-0.5">
                <span className="text-stone-500">{['上卦數', '下卦數', '動爻數'][i]}</span>
                <input
                  type="number"
                  min={1}
                  value={nums[k]}
                  onChange={(e) => setNums({ ...nums, [k]: e.target.value })}
                  className="w-20 border border-stone-300 rounded-lg px-2 py-1.5"
                />
              </label>
            ))}
            <button type="button" onClick={rand} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:border-stone-500 font-bold">
              <Dices className="w-3.5 h-3.5" />隨機
            </button>
            <label className="flex flex-col gap-0.5">
              <span className="text-stone-500">所問</span>
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className="border border-stone-300 rounded-lg px-2 py-1.5 bg-white">
                {TOPICS.map((t) => <option key={t} value={t}>{t === '整體' ? '整體流年（看世爻）' : t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-stone-500">起卦時間</span>
              <input type="datetime-local" value={castAtStr} onChange={(e) => setCastAtStr(e.target.value)} className="border border-stone-300 rounded-lg px-2 py-1.5" />
            </label>
            <button type="button" onClick={cast} className="px-5 py-1.5 rounded-lg bg-stone-900 text-amber-300 border border-amber-600 font-bold">起卦</button>
          </div>
          {error && <p className="text-xs text-rose-700">{error}</p>}
        </>
      )}

      {r && (
        <div className="space-y-4">
          {r.warnings.map((w, i) => <p key={i} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">⚠ {w}</p>)}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-lg text-stone-800">{r.year} {r.gz}年流年卦</span>
            <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${LEVEL_CLS[r.yearLevel]}`}>{r.topic === '整體' ? '全年' : r.topic} {r.yearLevel}</span>
            <span className="text-xs text-stone-500">所問：{r.topic === '整體' ? '整體流年（世爻）' : `${r.topic}（${r.targetName}）`}・數字 {saved.num1}、{saved.num2}、{saved.num3}・{new Date(saved.castAt).toLocaleString('zh-TW', { hour12: false })} 起卦</span>
            <button type="button" onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-stone-500 hover:text-rose-700 hover:underline">
              <RotateCcw className="w-3 h-3" />清除重卜
            </button>
          </div>

          <NajiaTable
            lines={r.linesData}
            pillars={r.pillars}
            fuShen={r.board.fuShen}
            timeLabel="起卦四柱"
            yongShenRelation={r.evaluation?.yongShen.relation || null}
            yongShenLineNum={r.evaluation && !r.evaluation.yongShen.isFu ? r.evaluation.yongShen.lineNum : null}
            headerRight={(
              <>
                本卦：<strong className="text-stone-800">{r.board.originalHex.name}</strong>・{r.palaceInfo.palaceName}宮（{r.palaceInfo.palaceWuxing}）
                {r.board.moving && <>・{r.board.moving}爻動 ➔ 變卦 {r.board.changedHex.name}</>}
                ・太歲 {r.taisui.branch}（{r.taisui.relation}）
              </>
            )}
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs leading-relaxed">
            <div className="font-bold text-sm text-stone-800 mb-1">全年論斷</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {r.yearNotes.map((n, i) => <li key={i}>{n}</li>)}
              {r.evaluation && <li>一事一占引擎（{r.topic}）：<b>{r.evaluation.level}</b>。{r.evaluation.summary}</li>}
            </ul>
            {r.evaluation?.advice && <p className="mt-1.5 text-stone-600">{r.evaluation.advice}</p>}
          </div>

          <SpecialPatterns patterns={r.patterns} />

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-stone-200 rounded-lg">
              <thead className="bg-stone-50 text-stone-500">
                <tr><th className="p-2">月份</th><th className="p-2">月建</th><th className="p-2">{r.targetName}</th><th className="p-2">吉凶</th><th className="p-2">說明</th></tr>
              </thead>
              <tbody>
                {r.months.map((m) => (
                  <tr key={m.idx} className="border-t border-stone-100">
                    <td className="p-2 font-bold whitespace-nowrap">{m.lunarName}</td>
                    <td className="p-2 whitespace-nowrap">{m.gz}</td>
                    <td className="p-2">{m.status}</td>
                    <td className="p-2"><span className={`rounded-full px-2 py-0.5 font-bold whitespace-nowrap ${LEVEL_CLS[m.level]}`}>{m.level}</span></td>
                    <td className="p-2 text-stone-600">{m.notes.slice(1).join('；') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-stone-500">太歲六親與「世爻沖太歲一年不順」出自唯心宗資料；逐月以月建論{r.targetName}旺衰、月破、入墓，是本站依六爻常法補上的細節。</p>

          <SmartReading systemKey="weixin" title={`AI 解流年卦 ‧ ${r.year}`} prompt={buildPrompt(profile, r)} systemPrompt={systemPrompt} onOpenSettings={onOpenSettings} />
        </div>
      )}
    </div>
  );
}
