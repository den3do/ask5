/**
 * 「一生詳述」：把紫微、人類圖、占星的排盤結果，依傳統規則轉成
 * 優點／缺點／各面向禍福／人生階段的白話文章。
 * 純規則式、不需要 AI；僅供自我探索與生活參考，不鐵口直斷生死或災禍。
 *
 * 輸出格式（三個系統共用）：
 * { labels:{good,mid,bad}, headline, overview[], strengths[], weaknesses[],
 *   fortunes:[{label,icon,tone,text}], keyTitle, keyPoints:[{title,text,tone}],
 *   stages:[{range,title,tone,text}], tips[] }
 */
import {
  ZW_STARS, ZW_AUX, ZW_BRIGHT, ZW_MUTAGEN, ZW_PALACE,
  HD_TYPES, HD_AUTH, HD_LINES, HD_CENTER_TEXT, HD_CHANNEL_GIFT, LIFE_CYCLES,
  AS_SIGNS, AS_HOUSE, AS_PLANET, AS_PLANET_IN_HOUSE, AS_VENUS_EL, AS_MARS_EL, AS_MERC_EL, AS_ASPECT, AS_ELEMENT,
} from '../data/lifeData.js';
import { HD_CENTERS, HD_CHANNELS } from './humanDesign.js';
import { analyzeDecadals, analyzeYear, sanFangPalaces } from './ziwei.js';
import { calculateLifeTransits } from './astrology.js';
import { lunarYearOf } from './lunar.js';

const uniq = (arr) => [...new Set(arr)];
const BR = '子丑寅卯辰巳午未申酉戌亥';

// ═════════════════════════ 紫微斗數 ═════════════════════════
const MUT_SCORE = { 祿: 2, 權: 1, 科: 1, 忌: -2 };

function opposite(palaces, p) {
  const i = BR.indexOf(p.earthlyBranch);
  return palaces.find((x) => x.earthlyBranch === BR[(i + 6) % 12]);
}
function starsOf(palaces, p) {
  if (p.majorStars.length) return { stars: p.majorStars, borrowed: false };
  const o = opposite(palaces, p);
  return { stars: o?.majorStars || [], borrowed: true };
}
/** 單一宮位自身的星曜分數（不含三方四正） */
function baseScore(palaces, p) {
  const { stars, borrowed } = starsOf(palaces, p);
  let s = 0;
  stars.forEach((st) => { s += (ZW_BRIGHT[st.brightness] ?? 0) * (borrowed ? 0.6 : 1) + (MUT_SCORE[st.mutagen] || 0); });
  p.minorStars.forEach((m) => {
    if (m.type === 'soft' || m.type === 'lucun') s += 1;
    if (m.type === 'tough') s -= 1;
    if (MUT_SCORE[m.mutagen]) s += MUT_SCORE[m.mutagen];
  });
  return s;
}
/**
 * 紫微論吉凶須「三方四正」合參：本宮為主（1），對宮次之（0.5），兩個三合宮各 0.35。
 * 本宮無主星已借對宮時，對宮權重降到 0.2 以免重複計算。
 */
function scorePalace(palaces, p) {
  const sf = sanFangPalaces(palaces, p);
  const borrowed = !p.majorStars.length;
  let s = baseScore(palaces, p);
  if (sf?.opposite) s += (borrowed ? 0.2 : 0.5) * baseScore(palaces, sf.opposite);
  (sf?.trine || []).forEach((t) => { s += 0.35 * baseScore(palaces, t); });
  return s;
}
const toneOf = (s) => (s >= 3 ? 'good' : s <= -2 ? 'bad' : 'mid');
const hasJi = (p) => [...p.majorStars, ...p.minorStars].some((x) => x.mutagen === '忌');
// 有化忌的宮位最高只給「平」：化忌代表該領域有需要修的功課
const palaceTone = (palaces, p) => { const t = toneOf(scorePalace(palaces, p)); return t === 'good' && hasJi(p) ? 'mid' : t; };
const starLabel = (s) => `${s.name}${s.brightness ? `（${s.brightness}）` : ''}${s.mutagen ? `化${s.mutagen}` : ''}`;
const weak = (s) => (ZW_BRIGHT[s.brightness] ?? 0) <= -1;

function auxNotes(p) {
  const good = []; const bad = [];
  p.minorStars.forEach((m) => {
    const a = ZW_AUX[m.name];
    if (!a) return;
    (a.k === 'bad' ? bad : good).push(`${m.name}（${a.t}）`);
  });
  return { good, bad };
}

const ZW_FIELD = { 官祿: 'w', 財帛: 'm', 夫妻: 'l', 疾厄: 'h' };
function palaceText(palaces, p) {
  const { stars, borrowed } = starsOf(palaces, p);
  const info = ZW_PALACE[p.name];
  if (!stars.length) return `${info.dom}：此宮與對宮皆無主星，受輔星與流年影響較大，隨環境起伏。`;
  const field = ZW_FIELD[p.name];
  const parts = stars.slice(0, 2).map((s) => {
    const d = ZW_STARS[s.name];
    if (!d) return starLabel(s);
    const body = field ? d[field] : `${d.g}；需留意${d.b}`;
    return `${starLabel(s)}：${field === 'h' ? `體質較易出現${body}` : body}${weak(s) ? '（星曜落陷，優點打折、缺點放大）' : ''}`;
  });
  const { good, bad } = auxNotes(p);
  const muts = [...p.majorStars, ...p.minorStars].filter((s) => s.mutagen).map((s) => `${s.name}化${s.mutagen}：${ZW_MUTAGEN[s.mutagen].t}`);
  let t = `${info.dom}｜${borrowed ? '本宮無主星，借對宮' : ''}${parts.join('；')}。`;
  const sf = sanFangPalaces(palaces, p);
  if (sf?.opposite) {
    const names = (q) => q.majorStars.map((s) => s.name).join('、') || '無主星';
    t += ` 三方四正：對宮${sf.opposite.name}（${names(sf.opposite)}）；三合${sf.trine.map((q) => `${q.name}（${names(q)}）`).join('、')}，吉凶已合看。`;
  }
  if (good.length) t += ` 助力：${good.join('、')}。`;
  if (bad.length) t += ` 阻力：${bad.join('、')}。`;
  if (muts.length) t += ` ${muts.join('；')}。`;
  return t;
}

export function buildZiweiStory(z) {
  const palaces = z.palaces;
  const byName = (n) => palaces.find((p) => p.name === n || p.name === `${n}宮`);
  const life = byName('命');
  const lifeStars = starsOf(palaces, life);
  const lifeNames = lifeStars.stars.map(starLabel).join('、') || '無主星';
  const traits = lifeStars.stars.slice(0, 2).map((s) => ZW_STARS[s.name]?.t).filter(Boolean);
  const bodyP = z.corePalaces.body;

  const overview = [
    `命宮在「${life.earthlyBranch}」宮，${lifeStars.borrowed ? '本宮無主星，借對宮' : '坐'}${lifeNames}；五行局為「${z.fiveElementsClass}」，命主星${z.soul}、身主星${z.body}。`,
    traits.length ? `這組星曜讓你的底色是：${traits.join('，同時')}。` : '命宮較不受單一主星主導，個性隨環境與對宮影響，彈性大但容易搖擺。',
    `身宮落在「${bodyP?.name || ''}」：${(bodyP && ZW_PALACE[bodyP.name]?.dom) || ''}——這是你中年之後心力最集中的領域。`,
  ];

  const fuDe = byName('福德');
  const strengths = [];
  const weaknesses = [];
  lifeStars.stars.slice(0, 3).forEach((s) => {
    const d = ZW_STARS[s.name]; if (!d) return;
    strengths.push(`${s.name}：${d.g}${weak(s) ? '（落陷，需靠後天努力發揮）' : ''}`);
    weaknesses.push(`${s.name}：${d.b}${ZW_BRIGHT[s.brightness] >= 1 ? '（星曜得力，缺點相對可控）' : ''}`);
  });
  [life, fuDe, byName('官祿')].filter(Boolean).forEach((p) => {
    const { good, bad } = auxNotes(p);
    if (good.length) strengths.push(`${p.name}有${good.join('、')}`);
    if (bad.length) weaknesses.push(`${p.name}見${bad.join('、')}`);
  });
  if (fuDe) {
    const fs = starsOf(palaces, fuDe).stars[0];
    if (fs && ZW_STARS[fs.name]) strengths.push(`福德宮（${fs.name}）：內心層面${ZW_STARS[fs.name].t}，晚年心境${ZW_BRIGHT[fs.brightness] >= 1 ? '偏安穩知足' : '需要自己刻意經營'}`);
  }

  const dom = [['事業', '官祿', '💼'], ['財運', '財帛', '💰'], ['感情婚姻', '夫妻', '💞'], ['健康', '疾厄', '🩺'], ['人際貴人', '僕役', '🤝'], ['家宅', '田宅', '🏠'], ['福分心境', '福德', '🍀'], ['外出發展', '遷移', '🧭'], ['子女創作', '子女', '👶']];
  const fortunes = dom.map(([label, pn, icon]) => {
    const p = byName(pn);
    return { label, icon, tone: palaceTone(palaces, p), text: palaceText(palaces, p), tag: `${p.name}・${p.earthlyBranch}` };
  });

  const keyPoints = [];
  palaces.forEach((p) => [...p.majorStars, ...p.minorStars].filter((s) => s.mutagen).forEach((s) => {
    keyPoints.push({
      title: `${s.name}化${s.mutagen} → ${p.name}`,
      text: `落在「${ZW_PALACE[p.name]?.dom || p.name}」：${ZW_MUTAGEN[s.mutagen].t}。`,
      tone: ZW_MUTAGEN[s.mutagen].k === 'good' ? 'good' : 'bad',
    });
  }));

  // 四化落點對大限／流年的加減分：祿權科入本宮、對宮、三合為助力，化忌為阻力
  const REL_W = { 本宮: 1, 對宮: 0.7, 三合: 0.5, 他宮: 0 };
  const landScore = (landings) => landings.reduce((s, l) => s + (REL_W[l.rel] || 0) * (MUT_SCORE[l.type] || 0), 0);
  const jiNear = (landings) => landings.some((l) => l.type === '忌' && (l.rel === '本宮' || l.rel === '對宮'));
  const landText = (landings) => landings.map((l) => `${l.star}化${l.type}入${l.palace ? `${l.palace.name}（${l.rel}）` : '盤外'}`).join('、');
  const finalTone = (base, landings) => {
    const t = toneOf(base + landScore(landings));
    return t === 'good' && jiNear(landings) ? 'mid' : t;
  };
  const sentenceOf = (tone, ji) => ({ good: '整體順遂，把握機會可有明顯收穫。', mid: ji ? '大致平穩，但有化忌入局，該領域宜放慢、留餘地。' : '起伏平穩，按部就班即可。', bad: '壓力與挑戰較多，宜保守、穩紮穩打、留退路。' }[tone]);

  const stages = analyzeDecadals(z).map((d) => {
    const p = d.palace;
    const tone = finalTone(scorePalace(palaces, p), d.landings);
    const { stars } = starsOf(palaces, p);
    return {
      range: `${d.range[0]}–${d.range[1]} 歲（虛歲）${d.current ? '　◀ 目前' : ''}`,
      title: `大限走「${p.name}」（天干${d.stem}）`,
      tone,
      text: `${ZW_PALACE[p.name].dec}。星曜：${stars.map(starLabel).join('、') || '無主星'}（已併看三方四正）。大限四化：${landText(d.landings)}。${sentenceOf(tone, jiNear(d.landings) || hasJi(p))}`,
    };
  });
  const nowY = lunarYearOf(); // 紫微流年以農曆年換界
  [nowY, nowY + 1, nowY + 2].forEach((y) => {
    const yi = analyzeYear(z, y);
    if (!yi.palace) return;
    const tone = finalTone(scorePalace(palaces, yi.palace), yi.landings);
    stages.push({
      range: `${y} 流年（${yi.stem}${yi.branch}）`,
      title: `流年命宮疊本命「${yi.palace.name}」`,
      tone,
      text: `${ZW_PALACE[yi.palace.name].dec}。流年四化：${landText(yi.landings)}。${sentenceOf(tone, jiNear(yi.landings))}（流年只看傾向，未計流月、流日與其他疊宮。）`,
    });
  });

  return {
    labels: { good: '吉', mid: '平', bad: '凶' },
    headline: `命宮 ${lifeNames}｜${z.fiveElementsClass}`,
    overview, strengths: uniq(strengths), weaknesses: uniq(weaknesses),
    fortunes, keyTitle: '生年四化：一生的「得」與「功課」', keyPoints, stages,
    tips: [
      '宮位吉凶已把對宮與兩個三合宮一起計入（三方四正），但仍是規則式的傾向判斷，非專業命理師的整體論斷。',
      '星曜落陷或見煞不是註定，而是提示「這個領域要靠後天多用心」。',
      '大限（十年運）以虛歲計，交接前後一兩年常有轉折，適合做調整而非冒進。',
      '化忌所在的領域，放慢、留餘地、少與人硬碰，是最好的化解。',
    ],
  };
}

// ═════════════════════════ 人類圖 ═════════════════════════
const ratioTone = (r) => (r >= 0.6 ? 'good' : r >= 0.3 ? 'mid' : 'bad');

export function buildHdStory(hd) {
  const T = HD_TYPES[hd.typeInfo.type] || HD_TYPES['生產者'];
  const def = Object.entries(hd.centers).filter(([, c]) => c.isDefined).map(([k]) => k);
  const open = Object.keys(HD_CENTERS).filter((k) => !def.includes(k));
  const auth = HD_AUTH.find(([k]) => hd.authority.startsWith(k))?.[1] || hd.authority;
  const [l1, l2] = hd.profileInfo.profile.split('/').map(Number);

  const overview = [
    `你是「${hd.typeInfo.type}」（人口比例${hd.typeInfo.rate}）。${T.core}`,
    `策略：${hd.typeInfo.strategy}。順著策略生活時會感受到「${hd.typeInfo.signature}」；偏離時會出現「${hd.typeInfo.notSelf}」。`,
    auth,
    `人生角色 ${hd.profileInfo.profile}（${hd.profileInfo.description}）。${HD_LINES[l1]}　${HD_LINES[l2]}`,
    `能量結構：${def.length} 個中心有定義、${open.length} 個中心開放（${hd.definition}）。定義的地方是你穩定的天賦，開放的地方是你容易吸收放大、也最能發展智慧之處。`,
  ];

  const strengths = [...T.g];
  def.slice(0, 4).forEach((k) => strengths.push(`${HD_CENTERS[k].chName}中心定義：${HD_CENTER_TEXT[k].g}`));
  hd.definedChannels.slice(0, 3).forEach((c) => strengths.push(`「${c.name}」${c.gates.join('-')}：${HD_CHANNEL_GIFT[c.gates.join('-')] || '穩定的天賦能量'}`));

  const weaknesses = [...T.b];
  open.slice(0, 5).forEach((k) => weaknesses.push(`${HD_CENTERS[k].chName}中心開放：${HD_CENTER_TEXT[k].v}`));

  const share = (ks) => ks.filter((k) => def.includes(k)).length / ks.length;
  const has = (k) => def.includes(k);
  const money = hd.definedChannels.some((c) => c.gates.join('-') === '21-45') ? '你有「金錢通道」，天生具備掌握與分配資源的能力。' : '';
  const fortunes = [
    { label: '事業工作', icon: '💼', tone: ratioTone(share(['sacral', 'throat', 'heart', 'gCenter'])), text: `${T.work}${money}` },
    { label: '財運', icon: '💰', tone: ratioTone(share(['heart', 'sacral', 'root', 'throat'])), text: `${T.money}${has('heart') ? ' 心臟中心定義，擅長談判與守住承諾。' : ' 心臟中心開放，要小心為了證明自己而過度消費或過度承諾。'}` },
    { label: '感情關係', icon: '💞', tone: ratioTone(share(['solar', 'gCenter', 'heart', 'sacral'])), text: `${T.love}${has('solar') ? ' 情緒中心定義：感情有波浪起伏，別在高潮或低谷做決定。' : ' 情緒中心開放：容易吸收伴侶的情緒，需分辨哪些是自己的。'}` },
    { label: '健康壓力', icon: '🩺', tone: ratioTone(share(['sacral', 'spleen', 'root', 'solar'])), text: `${T.health}${open.includes('root') ? ' 根部開放，容易被外界壓力催逼，需有意識放慢。' : ''}` },
    { label: '人際互動', icon: '🤝', tone: ratioTone(share(['gCenter', 'throat', 'heart', 'solar'])), text: `開放中心共 ${open.length} 個：${open.map((k) => HD_CENTERS[k].chName).join('、') || '無'}。這些地方會像海綿吸收身邊人的能量，選對相處的人，能放大你的智慧；選錯則容易被牽著走。` },
  ];

  const keyPoints = [
    ...hd.definedChannels.map((c) => ({ title: `${c.name}（${c.gates.join('-')}）`, text: `連結${HD_CENTERS[c.centers[0]].chName}與${HD_CENTERS[c.centers[1]].chName}：${HD_CHANNEL_GIFT[c.gates.join('-')] || ''}。`, tone: 'good' })),
    ...open.map((k) => ({ title: `${HD_CENTERS[k].chName}中心（開放）`, text: `課題：${HD_CENTER_TEXT[k].v}。智慧：${HD_CENTER_TEXT[k].w}。`, tone: 'mid' })),
  ];

  const extra = {
    '28–30 歲': `回到策略「${hd.typeInfo.strategy}」特別重要；若這幾年感到${hd.typeInfo.notSelf}，通常是偏離了自己的決策方式。`,
    '40–42 歲': `依內在權威（${hd.authority.split('（')[0]}）重新檢視人生，而不是跟著社會期待走。`,
  };
  // 人類圖的年齡週期為「所有人皆適用的通則」，並非由此人的盤面計算而來，明確標示以免被誤讀為個人預測
  const stages = LIFE_CYCLES.map((s) => ({ ...s, title: `${s.title}（通則）`, tone: 'mid', text: `${s.text}${extra[s.range] ? ` ${extra[s.range]}` : ''}` }));
  if (l1 === 6 || l2 === 6) stages.splice(4, 0, { range: '6 號角色的三階段', title: '試驗 → 退隱 → 楷模', tone: 'good', text: '約 30 歲前是跌撞試驗期，30–50 歲像站上屋頂觀察與沉澱，50 歲後才真正活成別人的榜樣；晚熟是設計，不是落後。' });

  return {
    labels: { good: '強項', mid: '一般', bad: '需留意' },
    headline: `${hd.typeInfo.type} ${hd.profileInfo.profile}｜${hd.definition}`,
    overview, strengths: uniq(strengths), weaknesses: uniq(weaknesses),
    fortunes, keyTitle: '定義通道與開放中心', keyPoints, stages,
    tips: [T.tip, '人類圖談的是「如何做決定與活出自己」，不是吉凶預測；以一個月的實驗觀察，比一次讀懂更有用。', '開放中心不是缺點，而是你最能成長的智慧入口。'],
  };
}

// ═════════════════════════ 西洋占星 ═════════════════════════
export function buildAstroStory(chart) {
  const sun = chart.sun.sign; const moon = chart.moon.sign; const asc = chart.asc.sign;
  const unknown = !!chart.timeUnknown; // 時間不詳：無真實上升與宮位
  const moonVaries = unknown && chart.moonSigns && chart.moonSigns[0].name !== chart.moonSigns[1].name;
  const S = (s) => AS_SIGNS[s.name];
  const pos = chart.positions;
  const houseSign = (h) => chart.houses[h - 1]?.sign;

  // 元素比重
  const ids = Object.keys(AS_PLANET);
  const el = { 火: 0, 土: 0, 風: 0, 水: 0 };
  ids.forEach((id) => { el[pos[id].sign.element] += 1; });
  const dominant = Object.keys(el).filter((k) => el[k] === Math.max(...Object.values(el)));
  const lacking = Object.keys(el).filter((k) => el[k] === 0);

  const overview = [
    `太陽在${sun.name}：${S(sun).kw}。${S(sun).g}是你的光芒所在。`,
    moonVaries
      ? `月亮當天在${chart.moonSigns[0].name}與${chart.moonSigns[1].name}之間移動，無法確定是哪一個；若是${chart.moonSigns[0].name}：${S(chart.moonSigns[0]).moon}；若是${chart.moonSigns[1].name}：${S(chart.moonSigns[1]).moon}。`
      : `月亮在${moon.name}：${S(moon).moon}。`,
    unknown ? '出生時間不詳：上升與宮位無法確定，以下不論上升與宮位，只看行星星座與相位。' : `上升在${asc.name}：${S(asc).asc}。`,
    `十大行星的元素分布：${Object.entries(el).map(([k, v]) => `${k}${v}`).join('、')}；${dominant.join('、')}象突出（${dominant.map((k) => AS_ELEMENT[k].has).join('、')}）${lacking.length ? `；${lacking.map((k) => AS_ELEMENT[k].lack).join('；')}` : ''}。`,
  ];

  // 相位
  const aspects = chart.aspects
    .filter((a) => AS_PLANET[a.planet1] && AS_PLANET[a.planet2] && AS_ASPECT[a.name])
    .sort((a, b) => a.orb - b.orb);
  const goodAsp = aspects.filter((a) => AS_ASPECT[a.name][1] === 'good');
  const badAsp = aspects.filter((a) => AS_ASPECT[a.name][1] === 'bad');
  const aspText = (a) => `${AS_PLANET[a.planet1].n}${a.name}${AS_PLANET[a.planet2].n}：${AS_PLANET[a.planet1].n}的${AS_PLANET[a.planet1].kw}與${AS_PLANET[a.planet2].n}的${AS_PLANET[a.planet2].kw}，${AS_ASPECT[a.name][0]}`;

  const strengths = [
    `太陽${sun.name}：${S(sun).g}`,
    ...(unknown ? [] : [`上升${asc.name}：給人的第一印象是優勢——${S(asc).asc.replace('給人', '').replace('的第一印象', '')}`]),
    `金星（${pos.venus.sign.name}）：${AS_VENUS_EL[pos.venus.sign.element]}`,
    ...dominant.map((k) => `${k}象突出：${AS_ELEMENT[k].has}`),
    ...goodAsp.slice(0, 2).map((a) => aspText(a)),
  ];
  const weaknesses = [
    `太陽${sun.name}：${S(sun).b}`,
    ...(moonVaries ? [] : [`月亮${moon.name}：${S(moon).b}`]),
    `火星（${pos.mars.sign.name}）：${AS_MARS_EL[pos.mars.sign.element]}`,
    ...lacking.map((k) => AS_ELEMENT[k].lack),
    ...badAsp.slice(0, 2).map((a) => aspText(a)),
  ];

  // 領域：house → 行星
  const inHouse = (h) => ids.filter((id) => pos[id].house === h);
  const domainText = (h) => {
    const list = inHouse(h);
    const hs = houseSign(h);
    const head = `第 ${h} 宮（${AS_HOUSE[h]}）`;
    if (!list.length) return { text: `${head}宮頭在${hs?.name || ''}（${hs ? S(hs).kw : ''}），無行星進駐，這個領域表現平穩，風格受${hs?.name || ''}特質與宮主星${hs?.ruling || ''}影響。`, score: 0 };
    let score = 0;
    const t = list.map((id) => {
      const k = AS_PLANET[id].k;
      score += k === 'good' ? 1 : k === 'bad' ? -1 : 0;
      return `${AS_PLANET[id].n}（${AS_PLANET[id].kw}）${AS_PLANET_IN_HOUSE[k]}`;
    });
    return { text: `${head}宮頭在${hs?.name || ''}，${t.join('；')}。`, score };
  };
  const sc = (n) => (n >= 1 ? 'good' : n <= -1 ? 'bad' : 'mid');
  const fortuneDef = [
    ['事業名聲', '💼', [10], `天頂在${chart.mc.sign.name}，社會形象偏向${S(chart.mc.sign).kw}。`],
    ['財運', '💰', [2, 8], ''],
    ['感情婚姻', '💞', [7, 5], `金星在${pos.venus.sign.name}第 ${pos.venus.house} 宮：${AS_VENUS_EL[pos.venus.sign.element]}。`],
    ['健康作息', '🩺', [6], `火星（${pos.mars.sign.name}）：${AS_MARS_EL[pos.mars.sign.element]}；土星在第 ${pos.saturn.house} 宮，長期需要紀律。`],
    ['人際貴人', '🤝', [11], `木星落第 ${pos.jupiter.house} 宮（${AS_HOUSE[pos.jupiter.house]}）：福氣與貴人容易出現在這個領域。`],
    ['家庭根基', '🏠', [4], ''],
  ];
  const fortunes = unknown
    ? [
      { label: '感情風格', icon: '💞', tone: 'mid', text: `金星在${pos.venus.sign.name}：${AS_VENUS_EL[pos.venus.sign.element]}。` },
      { label: '行動與健康', icon: '🩺', tone: 'mid', text: `火星在${pos.mars.sign.name}：${AS_MARS_EL[pos.mars.sign.element]}。` },
      { label: '思考與學習', icon: '🧠', tone: 'mid', text: `水星在${pos.mercury.sign.name}：${AS_MERC_EL[pos.mercury.sign.element]}。` },
      { label: '機運與擴張', icon: '🍀', tone: 'mid', text: `木星在${pos.jupiter.sign.name}：福氣傾向在${S(pos.jupiter.sign).kw}相關的領域出現（宮位需出生時間，此處略）。` },
      { label: '責任與課題', icon: '🧱', tone: 'mid', text: `土星在${pos.saturn.sign.name}：長期功課與${S(pos.saturn.sign).kw}有關（宮位需出生時間，此處略）。` },
    ]
    : fortuneDef.map(([label, icon, hs, extra]) => {
      const parts = hs.map(domainText);
      return { label, icon, tone: sc(parts.reduce((s, p) => s + p.score, 0)), text: `${parts.map((p) => p.text).join(' ')}${extra ? ` ${extra}` : ''}` };
    });

  const keyPoints = [
    { title: `水星（${pos.mercury.sign.name}）思考風格`, text: `${AS_MERC_EL[pos.mercury.sign.element]}。`, tone: 'mid' },
    ...aspects.slice(0, 8).map((a) => ({ title: `${a.symbol} ${AS_PLANET[a.planet1].n}${a.name}${AS_PLANET[a.planet2].n}`, text: `${aspText(a)}（容許度 ${a.orb.toFixed(1)}°）。`, tone: AS_ASPECT[a.name][1] === 'good' ? 'good' : 'bad' })),
  ];

  const sat = pos.saturn.house; const ura = pos.uranus.house; const jup = pos.jupiter.house;
  const houseNote = (h, what) => (unknown ? '' : ` 你的${what}在第 ${h} 宮，焦點在「${AS_HOUSE[h]}」。`);
  const T = Object.fromEntries(calculateLifeTransits(chart).map((t) => [t.key, t]));
  const ageRange = (t) => (t && t.ages.length ? `約 ${Math.min(...t.ages).toFixed(0)}–${Math.max(...t.ages).toFixed(0)} 歲` : '');
  const stages = [
    { range: '0–12 歲', title: '性格成形', tone: 'mid', text: `${moonVaries ? '月亮星座不確定，情感模式請以家人觀察為準。' : `月亮${moon.name}的情感模式在此階段養成：${S(moon).moon}。`}` },
    { range: T.jupReturn ? `木星回歸：${T.jupReturn.ages.map((a) => a.toFixed(0)).join(' / ')} 歲` : '木星回歸', title: '木星回歸（每 12 年，依本命實算）', tone: 'good', text: `機會與擴張的循環。${unknown ? '' : `你的木星在第 ${jup} 宮，這些年份在「${AS_HOUSE[jup]}」較容易遇到成長與貴人。`}` },
    { range: T.nodeReturn ? `北交點回歸：${ageRange(T.nodeReturn)}` : '北交點回歸', title: '人生方向的第一次校準', tone: 'mid', text: `${T.nodeReturn.text} 常伴隨升學、離家或重大選擇。` },
    { range: T.satReturn1 ? `土星回歸：${ageRange(T.satReturn1)}` : '土星回歸', title: '第一次土星回歸（依本命實算）', tone: 'mid', text: `${T.satReturn1.text} 這是責任與現實的重整期，常見轉職、關係定位與生活方式的調整。${houseNote(sat, '土星')}` },
    { range: T.uraOpp ? `天王星對分：${ageRange(T.uraOpp)}` : '天王星對分', title: '中年轉化（依本命實算）', tone: 'mid', text: `${T.uraOpp.text} 傾向帶來「想改變」的衝動。${houseNote(ura, '天王星')}` },
    { range: T.satReturn2 ? `第二次土星回歸：${ageRange(T.satReturn2)}` : '第二次土星回歸', title: '收穫與整理（依本命實算）', tone: 'mid', text: `${T.satReturn2.text}${unknown ? '' : ` 回到「${AS_HOUSE[sat]}」整理一生成果。`}` },
  ];

  return {
    labels: { good: '順', mid: '平', bad: '挑戰' },
    headline: unknown ? `${sun.name}太陽・${moonVaries ? '月亮待定' : `${moon.name}月亮`}（時間不詳）` : `${sun.name}太陽・${moon.name}月亮・${asc.name}上升`,
    overview, strengths: uniq(strengths), weaknesses: uniq(weaknesses),
    fortunes, keyTitle: '關鍵相位與行星風格', keyPoints, stages,
    tips: [
      '相位的「挑戰」不是壞事，而是促使你成長的張力；和諧相位則是容易被忽略的天賦。',
      '行星週期（土星回歸、天王星對分）是人人都會經歷的階段，個人差異在於它落在哪個領域。',
      '星座描述的是傾向，不是命令；你的選擇比星盤更重要。',
    ],
  };
}

/** 單一宮位的解讀（供命盤點選宮位時顯示） */
export function describePalace(z, palace) {
  return { tone: palaceTone(z.palaces, palace), text: palaceText(z.palaces, palace) };
}
