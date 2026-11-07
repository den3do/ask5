/**
 * 全維度（易經＋紫微＋西洋占星＋人類圖）個人檔案與雙人合盤
 */
import { calculateAstroChart, CITY_LIST, calculateSynastry } from './astrology.js';
import { calculateHumanDesign, compareHumanDesign } from './humanDesign.js';
import { calculateZiweiAstrolabe } from './ziwei.js';
import { computeDestiny, clockToHourIdx } from './destiny.js';
import { generateCompatibilityReport } from './iching.js';
import { trueSolarTime } from './ephemeris.js';

export const DEFAULT_BIRTH = {
  name: '', gender: '男', year: '1995', month: '8', day: '15',
  hour: '12', minute: '0', cityIdx: 0, tzOverride: '',
};

// ───────────────────── 共用：五行與地支關係 ─────────────────────
const WX_GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WX_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const ASTRO_TO_WX = { 火: '火', 土: '土', 風: '木', 水: '水' }; // 風象近巽木

/** @returns {'生'|'被生'|'比和'|'剋'|'被剋'|null} 以 a 為主視角 */
export function wuxingRelation(a, b) {
  if (!a || !b) return null;
  if (a === b) return '比和';
  if (WX_GEN[a] === b) return '生';
  if (WX_GEN[b] === a) return '被生';
  if (WX_KE[a] === b) return '剋';
  if (WX_KE[b] === a) return '被剋';
  return null;
}

const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SANHE = [['申', '子', '辰'], ['寅', '午', '戌'], ['亥', '卯', '未'], ['巳', '酉', '丑']];
const HAI = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];

export function branchRelation(a, b) {
  if (!a || !b) return null;
  if (a === b) return '同宮';
  const ia = BR.indexOf(a);
  const ib = BR.indexOf(b);
  if (ia < 0 || ib < 0) return null;
  if ((ia + ib) % 12 === 1) return '六合'; // 子丑、寅亥、卯戌、辰酉、巳申、午未
  if ((ia + 6) % 12 === ib) return '六沖';
  if (SANHE.some((g) => g.includes(a) && g.includes(b))) return '三合';
  if (HAI.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return '六害';
  return null;
}

const STAR_WX = {
  紫微: '土', 天機: '木', 太陽: '火', 武曲: '金', 天同: '水', 廉貞: '火', 天府: '土',
  太陰: '水', 貪狼: '水', 巨門: '水', 天相: '水', 天梁: '土', 七殺: '金', 破軍: '水',
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

// ───────────────────── 生辰解析 ─────────────────────
export function resolveBirth(b) {
  const city = CITY_LIST[parseInt(b.cityIdx, 10)] || CITY_LIST[0];
  const tz = b.tzOverride !== '' && b.tzOverride !== undefined && !Number.isNaN(Number(b.tzOverride)) ? Number(b.tzOverride) : city.tz;
  return {
    year: parseInt(b.year, 10),
    month: parseInt(b.month, 10),
    day: parseInt(b.day, 10),
    hour: parseInt(b.hour, 10) || 0,
    minute: parseInt(b.minute, 10) || 0,
    city, tz,
  };
}

export function validateBirth(b) {
  const r = resolveBirth(b);
  if (![r.year, r.month, r.day].every(Number.isFinite)) return '請完整填寫出生年月日';
  if (r.year < 1900 || r.year > 2100) return '出生年請介於 1900–2100';
  if (r.month < 1 || r.month > 12) return '月份需為 1–12';
  const dim = new Date(Date.UTC(r.year, r.month, 0)).getUTCDate();
  if (r.day < 1 || r.day > dim) return `${r.year} 年 ${r.month} 月只有 ${dim} 天`;
  if (r.hour < 0 || r.hour > 23 || r.minute < 0 || r.minute > 59) return '出生時間需為 00:00–23:59';
  return null;
}

// ───────────────────── 個人完整檔案 ─────────────────────
export function computeFullProfile(birth) {
  const err = validateBirth(birth);
  if (err) throw new Error(err);
  const r = resolveBirth(birth);
  const name = birth.name || '命主';
  const gender = birth.gender === '女' ? '女' : '男';
  const hourIdx = clockToHourIdx(r.hour);
  const ziHour = r.hour === 23 ? 12 : hourIdx; // iztro：12 = 晚子時

  const destiny = computeDestiny({
    name, calendarType: 'solar', year: r.year, month: r.month, day: r.day, hourIdx, gender,
  });
  const ziwei = calculateZiweiAstrolabe({
    calendarType: 'solar', year: r.year, month: r.month, day: r.day, hourIdx: ziHour, gender,
  });
  const astro = calculateAstroChart({
    year: r.year, month: r.month, day: r.day, hour: r.hour, minute: r.minute,
    lat: r.city.lat, lon: r.city.lon, tz: r.tz,
  });
  const hd = calculateHumanDesign({ year: r.year, month: r.month, day: r.day, hour: r.hour, minute: r.minute, tz: r.tz });
  const solarTime = trueSolarTime({ year: r.year, month: r.month, day: r.day, hour: r.hour, minute: r.minute, lon: r.city.lon, tz: r.tz });

  const profile = { name, gender, birth: r, destiny, ziwei, astro, hd, solarTime };
  profile.cards = buildCards(profile);
  profile.elements = buildElementTally(profile);
  return profile;
}

function soulStarNames(ziwei) {
  return (ziwei.corePalaces.soul?.majorStars || []).map((s) => s.name);
}

function buildElementTally(p) {
  const tally = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const sources = [];
  const add = (wx, label) => {
    if (wx && tally[wx] !== undefined) { tally[wx] += 1; sources.push(`${label}${wx}`); }
  };
  const shi = p.destiny.linesData.find((l) => l.isShi);
  add(shi?.wuxing, '世爻');
  add(p.destiny.palaceInfo.palaceWuxing, '卦宮');
  const soulStar = soulStarNames(p.ziwei)[0];
  add(STAR_WX[soulStar], `命宮${soulStar || ''}`);
  add(ASTRO_TO_WX[p.astro.sun.sign.element], '太陽');
  add(ASTRO_TO_WX[p.astro.moon.sign.element], '月亮');
  add(ASTRO_TO_WX[p.astro.asc.sign.element], '上升');
  const max = Math.max(...Object.values(tally));
  const dominant = Object.keys(tally).filter((k) => tally[k] === max && max > 0);
  const missing = Object.keys(tally).filter((k) => tally[k] === 0);
  return { tally, dominant, missing, sources };
}

function palaceLine(palace) {
  if (!palace) return '無資料';
  const majors = palace.majorStars.map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ''}`).join('、') || '無主星';
  return `${palace.earthlyBranch}宮｜${majors}`;
}

function buildCards(p) {
  const shi = p.destiny.linesData.find((l) => l.isShi);
  const z = p.ziwei;
  const a = p.astro;
  const hd = p.hd;
  return [
    {
      key: 'iching', title: '易經命卦', accent: 'amber',
      headline: `${p.destiny.hexagrams.original.name}（${p.destiny.hexagrams.palace}）`,
      lines: [
        `世爻：${shi?.branch || ''}${shi?.wuxing || ''}行（${shi?.relation || ''}）`,
        `互卦：${p.destiny.hexagrams.nuclear.hex.name}`,
        `四柱：${p.destiny.meta.pillars}`,
      ],
    },
    {
      key: 'ziwei', title: '紫微斗數', accent: 'purple',
      headline: `命宮 ${soulStarNames(z).join('、') || '無主星'}`,
      lines: [
        `${z.fiveElementsClass}｜命主 ${z.soul}｜身主 ${z.body}`,
        `官祿：${palaceLine(z.corePalaces.career)}`,
        `夫妻：${palaceLine(z.corePalaces.marriage)}`,
      ],
    },
    {
      key: 'astro', title: '西洋占星', accent: 'blue',
      headline: `${a.sun.sign.name}太陽・${a.moon.sign.name}月亮・${a.asc.sign.name}上升`,
      lines: [
        `太陽 ${a.sun.sign.degreeStr}`,
        `月亮 ${a.moon.sign.degreeStr}`,
        `上升 ${a.asc.sign.degreeStr}｜天頂 ${a.mc.sign.name}`,
      ],
    },
    {
      key: 'hd', title: '人類圖', accent: 'emerald',
      headline: `${hd.typeInfo.type} ${hd.profileInfo.profile}`,
      lines: [
        `策略：${hd.typeInfo.strategy}`,
        `權威：${hd.authority}`,
        `通道：${hd.definedChannels.map((c) => c.gates.join('-')).join('、') || '無完整通道'}`,
      ],
    },
  ];
}

// ───────────────────── 個人 AI Prompt ─────────────────────
export function generateUnifiedPrompt(p) {
  const d = p.destiny;
  const z = p.ziwei;
  const a = p.astro;
  const hd = p.hd;
  const shi = d.linesData.find((l) => l.isShi);
  const planetNames = { sun: '太陽', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星', asc: '上升', mc: '天頂' };
  const planets = Object.entries(planetNames).map(([id, n]) => `${n}${a.positions[id].sign.degreeStr}`).join('、');
  const majorAspects = a.aspects.filter((x) => x.nature === 'major').slice(0, 8)
    .map((x) => `${planetNames[x.planet1]}${x.name}${planetNames[x.planet2]}`).join('、');
  const mutagens = [];
  z.raw.palaces.forEach((pl) => [...pl.majorStars, ...pl.minorStars].forEach((s) => {
    if (s.mutagen) mutagens.push(`${s.name}化${s.mutagen}（${pl.name}）`);
  }));
  const el = p.elements;

  return `您好，請同時以易經六爻命卦、紫微斗數、西洋占星心理學與人類圖四大體系大師的視角，為【${p.name}】（${p.gender}，${p.birth.year}/${p.birth.month}/${p.birth.day} ${String(p.birth.hour).padStart(2, '0')}:${String(p.birth.minute).padStart(2, '0')}，${p.birth.city.name}）撰寫一份「全象本命．個人人格深度報告」。

【一、易經命卦】
- 四柱：${d.meta.pillars}；旬空：${d.meta.kongWang || '無'}
- 本命卦：${d.hexagrams.original.name}（${d.hexagrams.palace}）；互卦：${d.hexagrams.nuclear.hex.name}
- 世爻：${shi?.branch || ''}${shi?.wuxing || ''}行，${shi?.relation || ''}；世爻位置：${d.hexagrams.shiPosition}
- 性格：${d.personality.wuxingArchetype.title}。${d.personality.coreMindset}
- 事業：${d.career.roleOrientation}；財運：${d.wealth.wealthPattern}；情感：${d.relationship.shiYingDynamic}

【二、紫微斗數】
- ${z.chineseDate}；${z.fiveElementsClass}；命主星 ${z.soul}、身主星 ${z.body}
- 命宮：${palaceLine(z.corePalaces.soul)}；身宮：${z.corePalaces.body?.name || ''}（${z.corePalaces.body?.earthlyBranch || ''}）
- 財帛：${palaceLine(z.corePalaces.wealth)}；官祿：${palaceLine(z.corePalaces.career)}；夫妻：${palaceLine(z.corePalaces.marriage)}；遷移：${palaceLine(z.corePalaces.travel)}
- 四化：${mutagens.join('、') || '見各宮'}

【三、西洋占星】
- ${planets}
- 主要相位：${majorAspects || '無明顯大相位'}

【四、人類圖】
- 類型 ${hd.typeInfo.type}；策略 ${hd.typeInfo.strategy}；內在權威 ${hd.authority}；${hd.definition}；人生角色 ${hd.profileInfo.profile}（${hd.profileInfo.description}）
- 已定義中心：${Object.values(hd.centers).filter((c) => c.isDefined).map((c) => c.chName).join('、') || '無'}；開放中心：${Object.values(hd.centers).filter((c) => !c.isDefined).map((c) => c.chName).join('、') || '無'}
- 通道：${hd.definedChannels.map((c) => `${c.gates.join('-')}${c.shortName}`).join('、') || '無完整通道'}
- 意識太陽 Gate ${hd.conscious.sun.gate}.${hd.conscious.sun.line}、潛意識太陽 Gate ${hd.unconscious.sun.gate}.${hd.unconscious.sun.line}

【五行交叉統計（系統估算）】
- 分布：${Object.entries(el.tally).map(([k, v]) => `${k}${v}`).join(' ')}；偏重：${el.dominant.join('、') || '均衡'}；缺少：${el.missing.join('、') || '無'}

【請依下列結構撰寫（總字數建議六千至一萬字，語氣溫暖專業、少用空泛套話）】
1. 人格總綱：四套體系「一致指向的核心特質」與「彼此矛盾之處」，並解釋矛盾如何整合（外在表現、內在需求、決策方式各一段）。
2. 天賦與事業：最適合的賽道、合作方式、容易卡關的模式，並指出哪些體系互相印證。
3. 財富與資源：求財模式、聚財與漏財點、適合的風險策略。
4. 情感與親密關係：愛的語言、吸引的類型、重複出現的關係課題與經營建議。
5. 身心能量與壓力管理：依各體系提示的耗能與回充方式。
6. 人生階段與關鍵提醒：依年齡段列出主題與行動重點。
7. 未來十二個月的行動清單（五到七條可落地建議）與一句座右銘。

請務必註明每項結論主要來自哪一個體系，若體系間說法不同請明說，不要硬湊。`;
}

// ───────────────────── 紫微雙人比較 ─────────────────────
function marriageStarsOf(z) {
  return (z.corePalaces.marriage?.majorStars || []).map((s) => s.name);
}
function mutagenCount(palace, type) {
  if (!palace) return 0;
  return [...palace.majorStars, ...palace.minorStars].filter((s) => s.mutagen === type).length;
}

export function compareZiwei(zA, zB) {
  const notes = [];
  let score = 58;
  const soulA = zA.corePalaces.soul;
  const soulB = zB.corePalaces.soul;
  const marA = zA.corePalaces.marriage;
  const marB = zB.corePalaces.marriage;
  const starA = soulStarNames(zA)[0];
  const starB = soulStarNames(zB)[0];

  // 1. 命宮主星五行
  const rel = wuxingRelation(STAR_WX[starA], STAR_WX[starB]);
  if (rel) {
    const txt = `命宮主星 ${starA}（${STAR_WX[starA]}）× ${starB}（${STAR_WX[starB]}）：${rel === '比和' ? '五行比和' : rel.includes('生') ? '五行相生' : '五行相剋'}`;
    if (rel === '比和') { score += 3; notes.push({ tone: 'good', text: `${txt}，價值觀相近。` }); }
    else if (rel === '生' || rel === '被生') { score += 6; notes.push({ tone: 'good', text: `${txt}，一方自然滋養另一方。` }); }
    else { score -= 4; notes.push({ tone: 'warn', text: `${txt}，處事節奏容易互相牽制。` }); }
  }

  // 2. 命宮地支關係
  const br = branchRelation(soulA?.earthlyBranch, soulB?.earthlyBranch);
  if (br) {
    const map = { 六合: [8, 'good', '命宮六合，天生容易親近、互相成全'], 三合: [6, 'good', '命宮三合，目標與志趣易同步'], 同宮: [4, 'good', '命宮同宮，氣場相似'], 六沖: [-6, 'warn', '命宮六沖，吸引力強但容易正面衝突'], 六害: [-4, 'warn', '命宮相害，小地方易有隱性摩擦'] };
    const [d, tone, text] = map[br];
    score += d;
    notes.push({ tone, text: `${soulA.earthlyBranch}宮 × ${soulB.earthlyBranch}宮：${text}。` });
  }

  // 3. 夫妻宮落點與對方命宮
  const crossCheck = (mar, soul, from, to) => {
    if (!mar || !soul) return;
    if (mar.earthlyBranch === soul.earthlyBranch) {
      score += 10;
      notes.push({ tone: 'good', text: `${from}的夫妻宮落在${to}的命宮（${soul.earthlyBranch}宮），對${from}而言${to}正是理想伴侶的化身。` });
      return;
    }
    const r = branchRelation(mar.earthlyBranch, soul.earthlyBranch);
    if (r === '六合' || r === '三合') {
      score += 5;
      notes.push({ tone: 'good', text: `${from}夫妻宮與${to}命宮${r}，互相照應。` });
    } else if (r === '六沖') {
      score -= 2;
      notes.push({ tone: 'warn', text: `${from}夫妻宮與${to}命宮相沖，相處像鏡子般直白，需要學習包容。` });
    }
  };
  crossCheck(marA, soulB, 'A', 'B');
  crossCheck(marB, soulA, 'B', 'A');

  // 4. 對方命宮主星出現在我的夫妻宮
  const sameStar = (mar, soul, from, to) => {
    const hit = mar.filter((s) => soul.includes(s));
    if (hit.length) {
      score += 6 * hit.length;
      notes.push({ tone: 'good', text: `${to}的命宮主星（${hit.join('、')}）同時出現在${from}的夫妻宮，是「命中註定型」的星曜呼應。` });
    }
  };
  sameStar(marriageStarsOf(zA), soulStarNames(zB), 'A', 'B');
  sameStar(marriageStarsOf(zB), soulStarNames(zA), 'B', 'A');

  // 5. 夫妻宮四化
  for (const [who, mar] of [['A', marA], ['B', marB]]) {
    const ji = mutagenCount(mar, '忌');
    const good = mutagenCount(mar, '祿') + mutagenCount(mar, '權') + mutagenCount(mar, '科');
    if (ji) { score -= 4 * ji; notes.push({ tone: 'warn', text: `${who}的夫妻宮坐化忌，對感情較為執著敏感，需要彼此多溝通安全感。` }); }
    if (good) { score += 3 * good; notes.push({ tone: 'good', text: `${who}的夫妻宮有祿權科加持，感情運勢較順。` }); }
  }

  // 6. 五行局
  const wxA = zA.fiveElementsClass?.[0];
  const wxB = zB.fiveElementsClass?.[0];
  const rl = wuxingRelation(wxA, wxB);
  if (rl) {
    if (rl === '生' || rl === '被生') { score += 3; notes.push({ tone: 'good', text: `${zA.fiveElementsClass} 與 ${zB.fiveElementsClass}：五行局相生。` }); }
    else if (rl === '剋' || rl === '被剋') { score -= 2; notes.push({ tone: 'warn', text: `${zA.fiveElementsClass} 與 ${zB.fiveElementsClass}：五行局相剋，節奏需要磨合。` }); }
  }

  return { score: clamp(score, 35, 96), notes, starA, starB };
}

// ───────────────────── 雙人完整合盤 ─────────────────────
export function tierOf(score) {
  if (score >= 85) return { tier: '天作之合', desc: '四個體系大多指向共鳴，彼此是難得的靈魂夥伴。' };
  if (score >= 75) return { tier: '默契深厚', desc: '基礎契合度高，只要用心經營便能長久。' };
  if (score >= 65) return { tier: '互補成長', desc: '差異與吸引並存，彼此是對方的成長鏡子。' };
  if (score >= 55) return { tier: '需要磨合', desc: '摩擦點不少，但溝通得當仍可轉化為助力。' };
  return { tier: '挑戰課題', desc: '節奏落差明顯，需要大量理解與界線設定。' };
}

export function compareProfiles(pA, pB) {
  const shiA = pA.destiny.linesData.find((l) => l.isShi);
  const shiB = pB.destiny.linesData.find((l) => l.isShi);
  const iching = generateCompatibilityReport({
    personA: { name: pA.name, shiLine: shiA, palaceInfo: pA.destiny.palaceInfo, hexName: pA.destiny.hexagrams.original.name, report: pA.destiny },
    personB: { name: pB.name, shiLine: shiB, palaceInfo: pB.destiny.palaceInfo, hexName: pB.destiny.hexagrams.original.name, report: pB.destiny },
  });
  const ziwei = compareZiwei(pA.ziwei, pB.ziwei);
  const astro = calculateSynastry(pA.astro, pB.astro);
  const hd = compareHumanDesign(pA.hd, pB.hd);

  const dims = [
    { key: 'iching', label: '易經世應', score: clamp(iching.score, 30, 98) },
    { key: 'ziwei', label: '紫微命夫妻', score: ziwei.score },
    { key: 'astro', label: '占星合盤', score: astro.score },
    { key: 'hd', label: '人類圖通道', score: hd.score },
  ];
  const overall = clamp(dims.reduce((s, d) => s + d.score, 0) / dims.length, 30, 98);
  return { overall, ...tierOf(overall), dims, iching, ziwei, astro, hd };
}

export function generatePairPrompt(pA, pB, cmp) {
  const hdLine = (arr) => arr.map((c) => `${c.gates.join('-')}${c.shortName}（${c.who}）`).join('、') || '無';
  const astroLine = cmp.astro.aspects.slice(0, 10).map((x) => `A${x.labelA}${x.name}B${x.labelB}`).join('、') || '無明顯跨盤相位';
  const zNotes = cmp.ziwei.notes.map((n) => n.text).join(' ');
  const brief = (p) => `${p.name}（${p.gender}）：${p.destiny.hexagrams.original.name}卦／命宮${soulStarNames(p.ziwei).join('、') || '無主星'}／${p.astro.sun.sign.name}太陽・${p.astro.moon.sign.name}月亮・${p.astro.asc.sign.name}上升／${p.hd.typeInfo.type} ${p.hd.profileInfo.profile}`;

  return `您好，請同時以易經、紫微斗數、西洋占星與人類圖大師的視角，為下列兩人撰寫「太極同心．雙人全維合盤契合報告」。

【雙方概況】
- A｜${brief(pA)}
- B｜${brief(pB)}

【系統計算結果】
- 綜合契合度：${cmp.overall} 分（${cmp.tier}）；各維度：${cmp.dims.map((d) => `${d.label}${d.score}`).join('、')}
- 易經：${cmp.iching.dynamicSummary}｜亮點：${cmp.iching.synergyPoints?.join('；') || '互補'}｜摩擦：${cmp.iching.frictionPoints?.join('；') || '需磨合'}
- 紫微：${zNotes || '無特別呼應'}
- 占星跨盤相位：${astroLine}；主題分數 ${Object.entries(cmp.astro.themeScore).map(([k, v]) => `${k}${v}`).join('、')}
- 人類圖電磁通道（強烈吸引）：${hdLine(cmp.hd.electromagnetic)}
- 人類圖同伴通道（默契共鳴）：${hdLine(cmp.hd.companion)}
- 人類圖妥協通道（需要磨合）：${hdLine(cmp.hd.compromise)}
- 人類圖支配通道（一方主導）：${hdLine(cmp.hd.dominance)}

【請依下列結構撰寫】
1. 兩人關係的核心主題：吸引力從何而來、各自在關係中扮演的角色。
2. 四個體系一致與矛盾之處，並說明該相信哪一個層面（相處日常／情感需求／長期目標）。
3. 溝通與衝突模式：最容易引爆的三個場景，以及雙方各自可以做的具體調整。
4. 情感與親密、金錢與生活節奏的相處建議。
5. 給 A 的錦囊、給 B 的錦囊（各三到五條）。
6. 長久相處的黃金法則，與一句送給兩人的話。

請註明每個結論主要來自哪個體系，不要為了湊結論而美化負面訊號。`;
}
