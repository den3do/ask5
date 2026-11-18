import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Explainer, SectionTitle } from '../ui';
import SmartReading from '../SmartReading';
import NajiaTable from '../NajiaTable';
import { TRIGRAMS } from '../../data/constants';
import { getHexData } from '../../utils/iching';
import { weixinMingGua, buildWeixinChart } from '../../utils/weixin';

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
  const wx = weixinMingGua(profile.birth);
  const compU = wx.upperId;
  const compL = wx.lowerId;
  const [upId, setUpId] = useState(compU);
  const [loId, setLoId] = useState(compL);
  // 重新排盤（profile 換新）時丟掉舊的手動指定，回到新命盤的自動排卦；
  // 在 render 中比對前一次的 profile 立即重設，避免先閃一次舊的上下卦
  const [seenProfile, setSeenProfile] = useState(profile);
  if (seenProfile !== profile) {
    setSeenProfile(profile);
    setUpId(compU);
    setLoId(compL);
  }
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

      {(() => {
        const chart = buildWeixinChart(profile.birth, upId, loId, wx.movingLine);
        const changedHex = wx.movingLine ? chart.board.changedHex : null;
        return (
          <NajiaTable
            lines={chart.lines}
            pillars={chart.pillars}
            fuShen={chart.fuShen}
            timeLabel="出生四柱"
            headerRight={(
              <>
                唯心宗命卦：<strong className="text-stone-800">{hex.name}</strong>・{chart.palace.palaceName}宮（{chart.palace.palaceWuxing}）
                {changedHex && <>・{['初', '二', '三', '四', '五', '上'][wx.movingLine - 1]}爻動（依時辰）➔ 變卦 {changedHex.name}</>}
              </>
            )}
            toolbar={(
              <>
                <TrigramSelect label="上卦（外）" value={upId} onChange={setUpId} />
                <TrigramSelect label="下卦（內）" value={loId} onChange={setLoId} />
                {changed && (
                  <button type="button" onClick={() => { setUpId(compU); setLoId(compL); }} className="flex items-center gap-1 text-xs text-amber-700 hover:underline">
                    <RotateCcw className="w-3 h-3" />還原為自動排卦（{computedName}）
                  </button>
                )}
              </>
            )}
          />
        );
      })()}

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
