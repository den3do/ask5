// 三家融合總論：紫微斗數 × 人類圖 × 西洋占星
// 做法：各系統先轉成「共同主題標籤」，再找出「多家共識」與「彼此張力」，最後以白話組成總論。
// 純規則整理，不做吉凶斷語；標籤對應是象徵性類比，並非各系統的傳統定義。

const THEMES = {
  initiate: { label: '主動開創', desc: '傾向自己起頭、衝在前面，用行動帶出局面' },
  respond: { label: '回應與等待時機', desc: '比起硬推，更適合看清楚、等對的邀請或訊號再動' },
  steady: { label: '穩定務實', desc: '重視踏實、累積與可預期的成果' },
  change: { label: '變動靈活', desc: '喜歡新鮮感、多線並行，適應力強' },
  emotion: { label: '情感細膩', desc: '感受力強，重視情緒連結與安全感' },
  mind: { label: '理性思辨', desc: '習慣先分析、溝通、整理脈絡再行動' },
  independent: { label: '獨立自主', desc: '重視自己的節奏與判斷，不太愛被指揮' },
  relation: { label: '重視關係與協調', desc: '在人際、合作與平衡中找到位置' },
  vision: { label: '理想與遠見', desc: '關注意義、方向與長遠的可能性' },
  authority: { label: '領導與責任', desc: '容易被推到需要扛責任、做決定的位置' },
};

// 對立主題：同時出現代表內在拉扯，也是整合的功課
const TENSIONS = [
  ['initiate', 'respond', '想主動出擊 vs 需要等待時機', '衝動時先停一下，把「想做」和「對的時機」分開檢查。'],
  ['steady', 'change', '求穩定 vs 愛變動', '用「核心固定、細節彈性」的方式安排生活與工作。'],
  ['emotion', 'mind', '感受先行 vs 理性先行', '重要決定先讓情緒走完再分析，兩者都說完才下結論。'],
  ['independent', 'relation', '想要自主 vs 在意關係', '清楚說出自己的界線與需求，關係反而更穩。'],
];

// ───── 紫微：命宮主星 → 主題 ─────
const ZIWEI_STAR = {
  紫微: ['authority', 'independent'], 天機: ['mind', 'change'], 太陽: ['initiate', 'authority', 'vision'],
  武曲: ['steady', 'initiate'], 天同: ['emotion', 'relation'], 廉貞: ['independent', 'emotion'],
  天府: ['steady', 'authority'], 太陰: ['emotion', 'steady'], 貪狼: ['change', 'initiate'],
  巨門: ['mind', 'independent'], 天相: ['relation', 'steady'], 天梁: ['vision', 'authority'],
  七殺: ['initiate', 'independent'], 破軍: ['initiate', 'change'],
};
const ZIWEI_STAR_TEXT = {
  紫微: '帶領導氣質、重尊嚴', 天機: '腦筋轉得快、善於謀劃', 太陽: '熱情外放、愛照顧人', 武曲: '果斷務實、重執行與財務',
  天同: '隨和知足、重生活品質', 廉貞: '情感濃烈、原則分明', 天府: '穩重持守、善於經營', 太陰: '內斂細膩、重安全感',
  貪狼: '多才多慾、人緣魅力強', 巨門: '善於分析、口才與洞察', 天相: '重禮節、善於輔佐協調', 天梁: '有長者風範、愛為人解決問題',
  七殺: '獨立果敢、敢拚敢闖', 破軍: '勇於打破重來、不走尋常路',
};

// ───── 占星：元素／模式 ─────
const ELEMENT_THEME = { 火: ['initiate', 'vision'], 土: ['steady'], 風: ['mind', 'relation'], 水: ['emotion'] };
const MODE_THEME = { 基本: ['initiate'], 固定: ['steady', 'independent'], 變動: ['change'] };

// ───── 人類圖：類型 ─────
const HD_TYPE = {
  顯示者: ['initiate', 'independent'], 生產者: ['respond', 'steady'], 顯示生產者: ['respond', 'change', 'initiate'],
  投映者: ['respond', 'mind', 'relation'], 反映者: ['respond', 'relation', 'emotion'],
};

const stars = (palace) => (palace?.majorStars || []).map((s) => s.name);

/** 回傳每個系統的主題票與依據文字 */
function collect(p) {
  const z = p.ziwei;
  const a = p.astro;
  const hd = p.hd;
  const votes = { ziwei: new Map(), astro: new Map(), hd: new Map() };
  const evidence = { ziwei: [], astro: [], hd: [] };
  const vote = (sys, themes, why) => {
    themes.forEach((t) => votes[sys].set(t, (votes[sys].get(t) || 0) + 1));
    if (why) evidence[sys].push(why);
  };

  // 紫微：命宮＋身宮星曜
  const soul = z ? stars(z.corePalaces.soul) : [];
  // 星曜亮度：廟／旺 特質外顯（2 票）、利／平 一般（1 票）、不／陷 特質難發揮（不投票，僅註記）
  const brightOf = (n) => (z.corePalaces.soul?.majorStars || []).find((s) => s.name === n)?.brightness || '';
  soul.forEach((n) => {
    if (!ZIWEI_STAR[n]) return;
    const b = brightOf(n);
    if (/陷|不/.test(b)) { evidence.ziwei.push(`命宮${n}（${b}，${ZIWEI_STAR_TEXT[n]}之特質不易發揮）`); return; }
    const times = /廟|旺/.test(b) ? 2 : 1;
    for (let i = 0; i < times; i += 1) vote('ziwei', ZIWEI_STAR[n], i === 0 ? `命宮${n}${b ? `［${b}］` : ''}（${ZIWEI_STAR_TEXT[n]}）` : undefined);
  });
  // 命宮坐生年化忌：該星特質帶有執著與壓力，不宜只看正面
  (z?.corePalaces.soul?.majorStars || []).filter((s) => s.mutagen === '忌').forEach((s) => evidence.ziwei.push(`命宮${s.name}化忌（${ZIWEI_STAR_TEXT[s.name] || '該星特質'}同時帶有執著與壓力）`));
  if (z && !soul.length) {
    // 命宮無主星：借對宮（遷移宮）星曜
    stars(z.corePalaces.travel).forEach((n) => ZIWEI_STAR[n] && vote('ziwei', ZIWEI_STAR[n], `命宮無主星，借對宮${n}（${ZIWEI_STAR_TEXT[n]}）`));
  }
  const bodyStars = z ? stars(z.corePalaces.body) : [];
  bodyStars.forEach((n) => ZIWEI_STAR[n] && vote('ziwei', ZIWEI_STAR[n].slice(0, 1), `身宮${n}`));

  // 占星：日月升的元素與模式（太陽權重最高，故重複一次）
  const moonVaries = a.moonSigns && a.moonSigns[0].name !== a.moonSigns[1].name;
  [['sun', '太陽', 2], ['moon', '月亮', 1], ['asc', '上升', 1]].filter(([id]) => !(id === 'asc' && p.astro.timeUnknown) && !(id === 'moon' && moonVaries)).forEach(([id, label, w]) => {
    const s = a.positions[id].sign;
    for (let i = 0; i < w; i += 1) vote('astro', [...(ELEMENT_THEME[s.element] || []), ...(MODE_THEME[s.mode] || [])]);
    evidence.astro.push(`${label}${s.name}（${s.element}象・${s.mode}）`);
  });

  // 人類圖：類型＋權威＋已定義中心
  (HD_TYPE[hd.typeInfo.type] || []).forEach((t) => vote('hd', [t]));
  evidence.hd.push(`${hd.typeInfo.type}（${hd.typeInfo.strategy}）`);
  if (/情緒/.test(hd.authority) || hd.centers.solar?.isDefined) vote('hd', ['emotion'], `權威：${hd.authority}`);
  else if (/理智|無內在|外在|月亮/.test(hd.authority)) vote('hd', ['mind', 'relation'], `權威：${hd.authority}`);
  else evidence.hd.push(`權威：${hd.authority}`);
  if (hd.centers.heart?.isDefined || hd.centers.ego?.isDefined) vote('hd', ['authority', 'independent'], '意志力中心已定義');
  if (hd.centers.gCenter?.isDefined) vote('hd', ['vision']);

  return { votes, evidence };
}

/** 產生融合總論 */
export function buildFusionSummary(p) {
  const { votes, evidence } = collect(p);
  const sys = { ziwei: '紫微', astro: '占星', hd: '人類圖' };

  // 每個主題有幾家支持
  const support = Object.keys(THEMES).map((key) => {
    const by = Object.keys(votes).filter((s) => votes[s].has(key));
    const weight = Object.keys(votes).reduce((n, s) => n + (votes[s].get(key) || 0), 0);
    return { key, ...THEMES[key], by, weight };
  });

  // 共識門檻：至少兩家支持，且總票數 ≥ 3，避免只因粗標籤巧合重疊就稱「共識」
  const consensus = support.filter((t) => t.by.length >= 2 && t.weight >= 3).sort((a, b) => b.by.length - a.by.length || b.weight - a.weight).slice(0, 3);
  const solo = support.filter((t) => t.by.length === 1).sort((a, b) => b.weight - a.weight).slice(0, 2);
  const tensions = TENSIONS
    .filter(([x, y]) => {
      const sx = support.find((t) => t.key === x);
      const sy = support.find((t) => t.key === y);
      return sx.by.length && sy.by.length && !(sx.by.length === 1 && sy.by.length === 1 && sx.by[0] === sy.by[0]);
    })
    .map(([x, y, title, advice]) => ({
      title, advice,
      sideA: support.find((t) => t.key === x).by.map((s) => sys[s]).join('、'),
      sideB: support.find((t) => t.key === y).by.map((s) => sys[s]).join('、'),
    }))
    .slice(0, 2);

  const z = p.ziwei;
  const a = p.astro.positions;
  const hd = p.hd;
  const soulName = z ? (stars(z.corePalaces.soul).join('、') || '無主星（借對宮）') : '（出生時間不詳，未排）';
  const channelText = hd.definedChannels.length ? hd.definedChannels.slice(0, 3).map((c) => c.shortName).join('、') : '';

  // 開場：三家各用一句話描述自己
  const intro = `${p.name}的盤面，紫微看到命宮${soulName}，占星看到${a.sun.sign.name}太陽${p.astro.timeUnknown ? '（出生時間不詳，無上升）' : `、${a.moon.sign.name}月亮、${a.asc.sign.name}上升`}，人類圖則是${hd.typeInfo.type}${hd.profileInfo.profile}${hd.timeUncertainty && !hd.timeUncertainty.typeStable ? '（類型待確認）' : ''}。三套系統語言不同，把它們放在一起看，最值得相信的是「多家重複指向」的部分。`;

  const consensusText = consensus.length
    ? `三家重疊最明顯的是：${consensus.map((t) => `「${t.label}」（${t.by.map((s) => sys[s]).join('、')}）`).join('、')}。${consensus[0].desc}；這是最像「本命底色」的部分，不論換哪套語言都會看到。`
    : '三家各說各話，沒有特別集中的主題，代表你的性格層次多、情境不同會展現不同面向，建議以人類圖的策略與權威作為日常決策的主軸。';

  const soloText = solo.length
    ? `另外，${solo.map((t) => `${sys[t.by[0]]}特別強調「${t.label}」`).join('，')}，可視為單一視角下的補充面向，不必過度放大。`
    : '';

  const tensionText = tensions.length
    ? tensions.map((t) => `· ${t.title}（${t.sideA} ↔ ${t.sideB}）。${t.advice}`).join('\n')
    : '三家的方向相當一致，沒有明顯互相打架的地方。';

  const strengths = [];
  if (channelText) strengths.push(`人類圖已定義通道「${channelText}」是穩定可靠的天賦頻道`);
  strengths.push(...evidence.ziwei.slice(0, 1).map((e) => `紫微${e}`));
  strengths.push(`占星${evidence.astro[0]}的核心動能`);

  const open = Object.values(hd.centers).filter((c) => !c.isDefined).map((c) => c.chName);
  const lesson = `人類圖的「非自己主題」是${hd.typeInfo.notSelf}${open.length ? `，開放中心（${open.join('、')}）容易吸收外界影響` : ''}；當這些感覺出現，通常是偏離自己策略的訊號。`;

  const action = `日常決策建議：以人類圖的策略「${hd.typeInfo.strategy}」配合「${hd.authority}」為主，再用紫微命宮${soulName}的特質與占星的元素偏好檢視取捨，三者一致時行動，不一致時多給自己一些時間。`;

  const paragraphs = [
    { title: '三家合看', text: intro },
    { title: '共同底色', text: `${consensusText}${soloText ? `\n${soloText}` : ''}` },
    { title: '內在拉扯與整合', text: tensionText },
    { title: '天賦與課題', text: `天賦：${strengths.join('；')}。\n課題：${lesson}` },
    { title: '落地建議', text: action },
    { title: '使用須知', text: '本總論是把三套系統的象徵意涵歸納成十個通用主題後的整理，屬於「描述傾向」而非各系統的傳統斷語；主題很粗，不同人的盤很容易讀到相似的話，請以自身經驗檢驗、不要只因「說中了」就全盤採信。' },
  ];

  return {
    themes: consensus,
    paragraphs,
    evidence: Object.fromEntries(Object.entries(evidence).map(([k, v]) => [sys[k], v])),
  };
}

export function fusionSummaryAsText(s) {
  return s.paragraphs.map((x) => `【${x.title}】\n${x.text}`).join('\n\n');
}
