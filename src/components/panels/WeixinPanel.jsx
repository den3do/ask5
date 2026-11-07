import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Explainer, SectionTitle } from '../ui';
import SmartReading from '../SmartReading';
import { TRIGRAMS } from '../../data/constants';
import { getHexData } from '../../utils/iching';
import { weixinMingGua, changedTrigrams, buildWeixinChart } from '../../utils/weixin';

// 八卦取象（依唯心宗／易經常見象義整理）
const TRIGRAM_IMAGE = {
  1: { image: '天', virtue: '剛健創始', outer: '外在剛強、有領導與決斷氣勢', inner: '內心志向高遠、自我要求高' },
  2: { image: '澤', virtue: '喜悅溝通', outer: '外在親和、善於表達與交際', inner: '內心重情趣、渴望被認同' },
  3: { image: '火', virtue: '光明智慧', outer: '外在明亮、顯眼、有表現力', inner: '內心明白通透、邏輯與洞察力強' },
  4: { image: '雷', virtue: '震動奮起', outer: '外在行動力強、反應快', inner: '內心有衝勁、不甘平淡' },
  5: { image: '風', virtue: '柔順滲透', outer: '外在隨和、善於協調與流動', inner: '內心多思慮、重視細節與調整' },
  6: { image: '水', virtue: '險中求智', outer: '外在深沉、不輕易表態', inner: '內心歷練多、智謀與韌性並存' },
  7: { image: '山', virtue: '靜止篤實', outer: '外在穩重、有界線與原則', inner: '內心謹慎、重視安全與底線' },
  0: { image: '地', virtue: '包容承載', outer: '外在低調、包容、肯承擔', inner: '內心厚實、有耐性與涵養' },
};
const ORDER = [1, 2, 3, 4, 5, 6, 7, 0];

const WEIXIN_SYSTEM = `你是一位精通台灣「唯心宗（唯心聖教）」混元禪師所傳承之「鬼谷子心法與先天易經命卦」的命理專家。請依照唯心宗的哲學與推演邏輯，理解並解析命卦：
1. 命卦以個人出生年月日時（干支與先天數）為基礎，透過先天八卦、河圖洛書數理或干支五行生剋，轉化為六十四卦中的本命卦。
2. 解卦時分上卦（外在、環境、對外呈現）與下卦（內在、本質、心性）。例如「地火明夷」：上卦坤（大地、包容、承載、外在低調沉穩）、下卦離（光明、智慧、內在明亮），象義為光明入地中，內有洞察與智慧，外在多扮演默默支撐、韜光養晦的角色。
3. 融合唯心宗「易經心法、妙法人間」的實修精神，把卦象與當事人的實際生活、職場定位深度結合。語氣穩健、具智慧啟發性，避免過度迷信的宿命論，強調「知己知彼，順天應人，內明外順」。
一律使用繁體中文。`;

function HexLines({ upId, loId, moving }) {
  const bits = [...TRIGRAMS[upId].binary, ...TRIGRAMS[loId].binary]; // 由上而下
  return (
    <div className="space-y-2 w-40 mx-auto" aria-label="卦象">
      {bits.map((b, i) => {
        const isMoving = moving === 6 - i; // 初爻=最下方
        const bar = isMoving ? 'bg-rose-400' : 'bg-amber-300';
        return (
          <div key={i} className={`relative flex justify-between ${i === 2 ? 'mb-3' : ''}`}>
            {b === '1' ? <div className={`h-3 w-full rounded-sm ${bar}`} /> : (
              <>
                <div className={`h-3 w-[44%] rounded-sm ${bar}`} />
                <div className={`h-3 w-[44%] rounded-sm ${bar}`} />
              </>
            )}
            {isMoving && <span className="absolute -right-9 top-1/2 -translate-y-1/2 text-[11px] text-rose-300 whitespace-nowrap">○動</span>}
          </div>
        );
      })}
    </div>
  );
}

function Yao({ bit, cls, wide = 'w-16' }) {
  return (
    <div className={`${wide} flex justify-between`}>
      {bit === 1 ? <div className={`w-full h-2.5 rounded-sm ${cls}`} /> : (
        <>
          <div className={`w-[45%] h-2.5 rounded-sm ${cls}`} />
          <div className={`w-[45%] h-2.5 rounded-sm ${cls}`} />
        </>
      )}
    </div>
  );
}

function ChartTable({ chart }) {
  const { lines, pillars } = chart;
  return (
    <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden font-sans">
      <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 font-bold text-stone-800 text-sm">六爻全景納甲排盤 (從上爻至初爻)</div>
      <div className="px-6 py-3 border-b border-stone-200 bg-amber-50/50 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="text-xs text-stone-500">起卦時間</span>
        {[['年', pillars.year], ['月', pillars.month], ['日', pillars.day], ['時', pillars.hour]].map(([k, v]) => (
          <span key={k} className="text-stone-600"><strong className="text-stone-900 text-base tracking-wider">{v}</strong><span className="text-xs ml-0.5">{k}</span></span>
        ))}
        <span className="text-xs text-stone-600">旬空：<strong className="text-amber-700">{pillars.kongWang.join('、') || '無'}</strong></span>
        <span className="text-xs text-stone-600">月破：<strong className="text-rose-600">{pillars.yuePoBranch}</strong></span>
        <span className="text-xs text-stone-600">日破：<strong className="text-purple-600">{pillars.riPoBranch}</strong></span>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-stone-200 text-xs text-stone-500">
              <th className="py-2 px-3">六神</th>
              <th className="py-2 px-3">六親標註</th>
              <th className="py-2 px-3">本卦爻象</th>
              <th className="py-2 px-3">干支五行</th>
              <th className="py-2 px-3 text-center">卦爻符號 (本 ➔ 變)</th>
              <th className="py-2 px-3">動變與回頭作用</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {[...lines].reverse().map((line) => (
              <tr key={line.lineNum} className={line.isMoving ? 'bg-amber-50/60' : ''}>
                <td className="py-2.5 px-3 font-medium text-xs text-stone-600">{line.beast}</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-stone-800">{line.relation}</span>
                  {line.isShi && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white">世</span>}
                  {line.isYing && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-blue-600 text-white">應</span>}
                  {line.isKongWang && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-amber-600 text-white">空</span>}
                  {line.isYuePo && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-purple-600 text-white">月破</span>}
                </td>
                <td className="py-2.5 px-3 text-xs text-stone-600">第 {line.lineNum} 爻 ({line.bit === 1 ? '陽' : '陰'})</td>
                <td className="py-2.5 px-3 font-mono font-bold text-stone-700">{line.branch}{line.wuxing}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-center gap-3">
                    <Yao bit={line.bit} cls="bg-stone-800" />
                    <span className="text-stone-300 text-xs">➔</span>
                    {line.isMoving
                      ? <Yao bit={line.bit === 1 ? 0 : 1} cls="bg-amber-600" />
                      : <div className="opacity-70"><Yao bit={line.bit} cls="bg-stone-300" /></div>}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-xs">
                  {line.isMoving && line.changed ? (
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-900">動化: {line.changed.relation} {line.changed.branch}{line.changed.wuxing}</div>
                      <div className="text-stone-600 text-[11px]">
                        ({line.changed.interact}本爻{line.changed.specialInteract && <span className="ml-1 text-rose-600 font-bold">・{line.changed.specialInteract}</span>})
                      </div>
                    </div>
                  ) : <span className="text-stone-400 text-xs">安靜</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrigramSelect({ label, value, onChange }) {
  return (
    <label className="text-xs font-sans text-stone-600 flex items-center gap-2">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="border border-stone-300 rounded-lg px-2 py-1.5 bg-white text-stone-800">
        {ORDER.map((id) => <option key={id} value={id}>{TRIGRAMS[id].symbol} {TRIGRAMS[id].name}（{TRIGRAMS[id].nature}）</option>)}
      </select>
    </label>
  );
}

function buildPrompt(p, upId, loId, hex, computedName) {
  const up = TRIGRAMS[upId];
  const lo = TRIGRAMS[loId];
  const d = p.destiny;
  return `請以唯心宗命卦專家的視角，為命主【${p.name}】（${p.gender}）解析本命卦：

【出生資料】${p.birth.year}年${p.birth.month}月${p.birth.day}日 ${String(p.birth.hour).padStart(2, '0')}:${String(p.birth.minute).padStart(2, '0')}（${p.birth.calendarType === 'lunar' ? '農曆' : '國曆'}）
【四柱干支】${d.meta.pillars}
【唯心宗命卦】${hex.name}（上卦${up.name}・${TRIGRAM_IMAGE[upId].image}；下卦${lo.name}・${TRIGRAM_IMAGE[loId].image}）
- 上卦${up.name}：${TRIGRAM_IMAGE[upId].virtue}，${TRIGRAM_IMAGE[upId].outer}
- 下卦${lo.name}：${TRIGRAM_IMAGE[loId].virtue}，${TRIGRAM_IMAGE[loId].inner}
- 卦辭：${hex.text}
${hex.name !== computedName ? `（備註：自動排卦規則排出的命卦為「${computedName}」，上列為使用者指定之唯心宗命卦，請以指定命卦為準。）\n` : ''}
請依序解析：
1. 【命卦本質】上卦（外在）與下卦（內在）如何互動，形成怎樣的性格與處世風格。
2. 【職場定位與天賦】結合實際工作與角色，指出適合的位置與可能的盲點。
3. 【人生功課與修心重點】以「易經心法、妙法人間」的精神，給出可實踐的修養與行動建議。
4. 【一句話心法】以「內明外順」為核心，收束成一句座右銘。`;
}

export default function WeixinPanel({ profile, onOpenSettings }) {
  const d = profile.destiny;
  const wx = weixinMingGua(profile.birth);
  const compU = wx.upperId;
  const compL = wx.lowerId;
  const [upId, setUpId] = useState(compU);
  const [loId, setLoId] = useState(compL);
  const hex = getHexData(upId, loId);
  const computedName = getHexData(compU, compL).name;
  const up = TRIGRAMS[upId];
  const lo = TRIGRAMS[loId];
  const changed = upId !== compU || loId !== compL;

  return (
    <div className="space-y-6">
      <Explainer title="什麼是「唯心宗命卦」？" accent="amber">
        <p>唯心宗（唯心聖教）傳承「鬼谷子心法與先天易經」，以出生年月日時推出一個本命卦，並重視「<b>內明外順</b>」：<b>下卦看內在本質，上卦看外在呈現</b>，再把卦象落實到生活與職場。</p>
        <p className="inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[11px] font-black">實驗性規則・未經官方確認</p>
        <p><b>自動排卦規則</b>（依實測樣本反推）：換成農曆後，<b>上卦＝農曆日 ÷ 8 的餘數，下卦＝農曆月 ÷ 8 的餘數</b>（餘 0 為坤）。目前僅經少數樣本驗證，<b>不保證與官方完全一致</b>；若與你取得的命卦不同，可用下拉選單手動指定，解說與 AI 解讀會以你指定的卦為準。</p>
      </Explainer>

      <div className="rounded-2xl bg-stone-900 text-amber-100 p-5 shadow-lg grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
        <div className="text-center">
          <div className="text-xs text-amber-400/80 tracking-widest">唯心宗命卦</div>
          <div className="text-4xl font-black mt-1 tracking-wide">{hex.name}</div>
          <div className="text-xs text-stone-300 mt-1">上{up.name}（{up.nature}）　下{lo.name}（{lo.nature}）</div>
          <div className="mt-4"><HexLines upId={upId} loId={loId} moving={wx.movingLine} /></div>
        </div>
        <div className="space-y-3 font-sans">
          <div className="flex flex-col gap-2 bg-white rounded-xl p-3">
            <TrigramSelect label="上卦（外）" value={upId} onChange={setUpId} />
            <TrigramSelect label="下卦（內）" value={loId} onChange={setLoId} />
            {changed && (
              <button type="button" onClick={() => { setUpId(compU); setLoId(compL); }} className="self-start flex items-center gap-1 text-xs text-amber-700 hover:underline">
                <RotateCcw className="w-3 h-3" />還原為自動排卦（{computedName}）
              </button>
            )}
          </div>
          <div className="text-[11px] text-stone-300">四柱：{d.meta.pillars}</div>
          {wx.movingLine && (() => {
            const ch = changedTrigrams(upId, loId, wx.movingLine, TRIGRAMS);
            return (
              <div className="text-[11px] text-stone-300">
                動爻：{['初', '二', '三', '四', '五', '上'][wx.movingLine - 1]}爻（依時辰）　變卦：{getHexData(ch.upperId, ch.lowerId).name}
              </div>
            );
          })()}
        </div>
      </div>

      <ChartTable chart={buildWeixinChart(profile.birth, upId, loId, wx.movingLine)} />

      <div>
        <SectionTitle sub="上卦看外在、下卦看內在">內外取象</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-stone-700 leading-relaxed">
            <div className="font-bold text-sm text-stone-800 mb-1">上卦 {up.symbol} {up.name}（外在）</div>
            <div>象：{TRIGRAM_IMAGE[upId].image}・{TRIGRAM_IMAGE[upId].virtue}・五行屬{up.wuxing}</div>
            <div className="mt-1">{TRIGRAM_IMAGE[upId].outer}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-stone-700 leading-relaxed">
            <div className="font-bold text-sm text-stone-800 mb-1">下卦 {lo.symbol} {lo.name}（內在）</div>
            <div>象：{TRIGRAM_IMAGE[loId].image}・{TRIGRAM_IMAGE[loId].virtue}・五行屬{lo.wuxing}</div>
            <div className="mt-1">{TRIGRAM_IMAGE[loId].inner}</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-xs font-sans text-stone-700 leading-relaxed space-y-1">
          <div><b>卦辭：</b>{hex.text}</div>
          <div><b>白話：</b>{hex.vernacularText}</div>
          <div className="text-stone-500">心法提示：知己知彼，順天應人，內明外順。</div>
        </div>
      </div>

      <SmartReading
        systemKey="weixin"
        title="智慧相命 ‧ 唯心宗"
        prompt={buildPrompt(profile, upId, loId, hex, computedName)}
        systemPrompt={WEIXIN_SYSTEM}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
