import React from 'react';
import { Explainer, SectionTitle } from '../ui';
import SmartReading from '../SmartReading';
import { generateFusionPrompt } from '../../utils/profile';

const WX_BAR = { 木: 'bg-green-500', 火: 'bg-red-500', 土: 'bg-amber-600', 金: 'bg-slate-400', 水: 'bg-blue-500' };
const HEAD = [
  { key: 'iching', label: '易經命卦', emoji: '☯️', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  { key: 'ziwei', label: '紫微斗數', emoji: '🌌', cls: 'bg-purple-100 text-purple-900 border-purple-300' },
  { key: 'astro', label: '西洋占星', emoji: '🪐', cls: 'bg-sky-100 text-sky-900 border-sky-300' },
  { key: 'hd', label: '人類圖', emoji: '⬡', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
];

const first = (s) => String(s || '').split(/[。；]/)[0];
const stars = (p) => (p?.majorStars || []).map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ''}`).join('、') || '無主星';

function buildMatrix(p) {
  const d = p.destiny;
  const z = p.ziwei;
  const a = p.astro.positions;
  const hd = p.hd;
  const shi = d.linesData.find((l) => l.isShi);
  const ji = [];
  z.raw.palaces.forEach((pl) => [...pl.majorStars, ...pl.minorStars].forEach((s) => { if (s.mutagen === '忌') ji.push(`${s.name}化忌在${pl.name}`); }));
  const defined = Object.values(hd.centers).filter((c) => c.isDefined).map((c) => c.chName);
  const open = Object.values(hd.centers).filter((c) => !c.isDefined).map((c) => c.chName);

  return [
    {
      row: '核心本質',
      iching: `${d.personality.wuxingArchetype.title.split('‧')[0].trim()}（${shi?.wuxing}行・${shi?.relation}持世）`,
      ziwei: `命宮 ${stars(z.corePalaces.soul)}；命主 ${z.soul}`,
      astro: `太陽 ${a.sun.sign.name}（${a.sun.sign.element}象）`,
      hd: `${hd.typeInfo.type}・${hd.profileInfo.profile} ${hd.profileInfo.description}`,
    },
    {
      row: '外在氣場',
      iching: first(d.personality.beastManner),
      ziwei: `身宮在${z.corePalaces.body?.name || ''}；身主 ${z.body}`,
      astro: `上升 ${a.asc.sign.name}，天頂 ${a.mc.sign.name}`,
      hd: `策略：${hd.typeInfo.strategy}`,
    },
    {
      row: '情感與關係',
      iching: first(d.relationship.shiYingDynamic),
      ziwei: `夫妻宮 ${stars(z.corePalaces.marriage)}`,
      astro: `月亮 ${a.moon.sign.name}・金星 ${a.venus.sign.name}・火星 ${a.mars.sign.name}`,
      hd: `情緒中心${hd.centers.solar.isDefined ? '已定義（有情緒波浪）' : '開放（易吸收他人情緒）'}；G中心${hd.centers.gCenter.isDefined ? '已定義' : '開放'}`,
    },
    {
      row: '事業與財運',
      iching: first(d.career.roleOrientation).replace(/【|】/g, ''),
      ziwei: `官祿 ${stars(z.corePalaces.career)}；財帛 ${stars(z.corePalaces.wealth)}`,
      astro: `水星 ${a.mercury.sign.name}・木星 ${a.jupiter.sign.name}・土星 ${a.saturn.sign.name}`,
      hd: hd.definedChannels.length ? `通道：${hd.definedChannels.map((c) => c.shortName).join('、')}` : '無完整通道（以單一閘門發揮）',
    },
    {
      row: '決策方式',
      iching: `貴人方位 ${d.luckyKit.direction}；${first(d.wealth.wealthAdvice)}`,
      ziwei: `福德宮 ${stars(z.palaces.find((x) => x.name.startsWith('福德')))}`,
      astro: `水星 ${a.mercury.sign.degreeStr}`,
      hd: hd.authority,
    },
    {
      row: '功課與提醒',
      iching: first(d.personality.blindSpots),
      ziwei: ji.length ? ji.join('、') : '生年四化無化忌',
      astro: `土星 ${a.saturn.sign.name}（第 ${p.astro.positions.saturn.house} 宮）`,
      hd: `非自己主題：${hd.typeInfo.notSelf}；開放中心：${open.join('、') || '無'}`,
    },
  ];
}

export default function FusionPanel({ profile, onOpenSettings }) {
  const p = profile;
  const matrix = buildMatrix(p);
  const el = p.elements;
  const maxWx = Math.max(1, ...Object.values(el.tally));

  return (
    <div className="space-y-6">
      <Explainer title="「融合」是什麼？" accent="rose">
        <p>把易經、紫微、占星、人類圖四套系統放在同一張表上對照。四個系統的演算法與語言都不同，所以<b>不是每一格都會一致</b>；多個系統都指向的特質，通常是比較穩固的本命主題。</p>
        <p>下方矩陣由系統依各盤資料自動整理；有設定 API Key 時，可啟動「三師會診」，由武當老道、心理學專家、占卜大師依序發言，最後交相融合。</p>
      </Explainer>

      <div className="rounded-2xl bg-gradient-to-br from-stone-900 via-stone-800 to-rose-950 text-white p-6 shadow-xl text-center">
        <div className="text-xs tracking-[0.3em] text-rose-300">全象本命</div>
        <div className="text-3xl font-black mt-1">{p.name}</div>
        <div className="text-xs text-stone-300 mt-1 font-sans">
          {p.birth.year}/{p.birth.month}/{p.birth.day} {String(p.birth.hour).padStart(2, '0')}:{String(p.birth.minute).padStart(2, '0')}・{p.birth.city.name}
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-sans">
          {p.cards.map((c, i) => (
            <div key={c.key} className="rounded-lg bg-white/10 border border-white/15 px-3 py-2">
              <div className="text-[10px] text-stone-300">{HEAD[i].emoji} {c.title}</div>
              <div className="font-bold mt-0.5">{c.headline}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle sub="橫向看同一個主題，四個系統各說了什麼">四系統對照矩陣</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-xs font-sans min-w-[720px]">
            <thead>
              <tr>
                <th className="p-2.5 w-20 bg-stone-100 text-stone-600 text-left">主題</th>
                {HEAD.map((h) => <th key={h.key} className={`p-2.5 text-left border-l border-white ${h.cls}`}>{h.emoji} {h.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((r) => (
                <tr key={r.row} className="border-t border-stone-100 align-top">
                  <th className="p-2.5 bg-stone-50 text-stone-700 text-left font-bold">{r.row}</th>
                  {HEAD.map((h) => <td key={h.key} className="p-2.5 text-stone-700 leading-relaxed border-l border-stone-100">{r[h.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm font-sans">
          <SectionTitle sub={`來源：${el.sources.join('、')}`}>五行交叉分布</SectionTitle>
          <div className="space-y-1.5">
            {Object.entries(el.tally).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-bold">{k}</span>
                <div className="flex-1 h-3 bg-stone-100 rounded"><div className={`h-full rounded ${WX_BAR[k]}`} style={{ width: `${(v / maxWx) * 100}%` }} /></div>
                <span className="w-4 text-right text-stone-500">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-700 mt-3">偏重：<b>{el.dominant.join('、') || '均衡'}</b>　缺少：<b>{el.missing.join('、') || '無'}</b></p>
          <p className="text-[11px] text-stone-400 mt-1">占星元素以火→火、土→土、風→木、水→水對應，為本站自訂的估算，僅供參考。</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm font-sans">
          <SectionTitle sub="僅整理資料，不作吉凶斷語">人類圖能量速覽</SectionTitle>
          <div className="text-xs text-stone-700 space-y-1.5">
            <div>類型：<b>{p.hd.typeInfo.type}</b>（{p.hd.typeInfo.rate}）</div>
            <div>內在權威：{p.hd.authority}</div>
            <div>定義類型：{p.hd.definition}</div>
            <div>已定義中心：{Object.values(p.hd.centers).filter((c) => c.isDefined).map((c) => c.chName).join('、') || '無'}</div>
            <div>日月升：{p.astro.sun.sign.name}・{p.astro.moon.sign.name}・{p.astro.asc.sign.name}</div>
          </div>
        </div>
      </div>

      <SmartReading systemKey="fusion" title="智慧相命" prompt={generateFusionPrompt(p)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
