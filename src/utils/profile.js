/**
 * 全維度（易經＋紫微＋西洋占星＋人類圖）個人檔案與雙人合盤
 */
import { calculateAstroChart, CITY_LIST, calculateSynastry } from './astrology.js';
import { calculateHumanDesign, compareHumanDesign } from './humanDesign.js';
import { calculateZiweiAstrolabe } from './ziwei.js';
import { computeDestiny } from './destiny.js';
import { analyzeBazi, baziToText, compareBazi } from './bazi.js';
import { generateCompatibilityReport } from './iching.js';
import { resolveMoment } from './chineseTime.js';
import { buildFusionSummary, fusionSummaryAsText } from './fusionSummary.js';

export const DEFAULT_BIRTH = {
  name: '', gender: '男', year: '1995', month: '8', day: '15',
  hour: '12', minute: '0', cityIdx: 0, tzOverride: '', customLat: '', customLon: '',
  timeKnown: true, // false = 出生時間不詳
  useTrueSolar: false, // 預設鐘錶時間（台灣主流）；可改真太陽時
  zishi: 'next', // 夜子時：'next' 晚子時算次日；'same' 早晚子時（日柱不換）
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
  const city = resolveCity(b) || CITY_LIST[parseInt(b.cityIdx, 10)] || CITY_LIST[0];
  const timeKnown = !(b.timeKnown === false || b.timeKnown === 'false');
  const zishi = b.zishi === 'same' ? 'same' : 'next';
  const base = {
    year: parseInt(b.year, 10),
    month: parseInt(b.month, 10),
    day: parseInt(b.day, 10),
    // 時間不詳：以中午 12:00 作為「日期層級」計算的代用值（年月柱、行星位置）；時辰與上升一律不採用
    hour: timeKnown ? (parseInt(b.hour, 10) || 0) : 12,
    minute: timeKnown ? (parseInt(b.minute, 10) || 0) : 0,
  };
  const useTrueSolar = timeKnown && (b.useTrueSolar === true || b.useTrueSolar === 'true');
  const hasOverride = b.tzOverride !== '' && b.tzOverride !== undefined && b.tzOverride !== null && !Number.isNaN(Number(b.tzOverride));

  // 絕對時刻：依 IANA 歷史時區（含夏令）換算；使用者手動覆寫優先
  let moment = null;
  if ([base.year, base.month, base.day].every(Number.isFinite) && base.year >= 1900 && base.year <= 2100) {
    try {
      moment = resolveMoment({
        ...base, lon: city.lon, zone: city.zone, defaultTz: city.tz,
        tzOverride: hasOverride ? b.tzOverride : null, useTrueSolar, zishi,
      });
    } catch { moment = null; }
  }
  const tz = moment ? moment.tzHours : (hasOverride ? Number(b.tzOverride) : city.tz);
  return { ...base, city, tz, defaultTz: city.tz, useTrueSolar, timeKnown, zishi, moment };
}

/** 沒有辦法選到出生城市時，可手動輸入經緯度（cityIdx = 'custom'）。 */
export function resolveCity(b) {
  if (b.cityIdx === 'custom') {
    const lat = Number(b.customLat); const lon = Number(b.customLon);
    if (Number.isFinite(lat) && Number.isFinite(lon) && b.customLat !== '' && b.customLon !== '' && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      const tz = Math.round(lon / 15);
      return { name: '自訂地點', lat, lon, tz, zone: undefined };
    }
  }
  return null;
}

export function validateBirth(b) {
  if (b.cityIdx === 'custom' && !resolveCity(b)) return '自訂出生地請填入有效的緯度（-90~90）與經度（-180~180）';
  const r = resolveBirth(b);
  if (![r.year, r.month, r.day].every(Number.isFinite)) return '請完整填寫出生年月日';
  if (r.year < 1900 || r.year > 2100) return '出生年請介於 1900–2100';
  if (r.month < 1 || r.month > 12) return '月份需為 1–12';
  const dim = new Date(Date.UTC(r.year, r.month, 0)).getUTCDate();
  if (r.day < 1 || r.day > dim) return `${r.year} 年 ${r.month} 月只有 ${dim} 天`;
  if (r.hour < 0 || r.hour > 23 || r.minute < 0 || r.minute > 59) return '出生時間需為 00:00–23:59';
  if (!r.moment) return '無法解析出生時刻，請檢查日期、時間與時區';
  return null;
}

// ───────────────────── 個人完整檔案 ─────────────────────
export function computeFullProfile(birth) {
  const err = validateBirth(birth);
  if (err) throw new Error(err);
  const r = resolveBirth(birth);
  const name = birth.name || '命主';
  const gender = birth.gender === '女' ? '女' : '男';
  const moment = r.moment;
  if (!moment) throw new Error('無法解析出生時刻，請檢查日期與時間');
  const c = moment.chinese; // 中式命理共用的有效日期／時辰（真太陽時、夜子時換日）

  const timeKnown = r.timeKnown;
  const destiny = computeDestiny({
    name, year: r.year, month: r.month, day: r.day, gender, moment, timeUnknown: !timeKnown,
  });
  const pr = destiny.pillarsRaw;
  // 紫微必須有時辰：時間不詳時不排盤（不假造命宮）
  const ziwei = timeKnown
    ? calculateZiweiAstrolabe({
      calendarType: 'solar', year: c.year, month: c.month, day: c.day, hourIdx: c.hourIdx, gender,
      pillarsText: `${pr.year}年 ${pr.month}月 ${pr.day}日 ${pr.hour}時`,
    })
    : null;
  const astro = calculateAstroChart({
    year: r.year, month: r.month, day: r.day, hour: r.hour, minute: r.minute,
    lat: r.city.lat, lon: r.city.lon, tz: r.tz, timeKnown,
  });
  const hd = calculateHumanDesign({ year: r.year, month: r.month, day: r.day, hour: r.hour, minute: r.minute, tz: r.tz, timeKnown });
  const bazi = analyzeBazi(pr, { gender, utc: moment.utc });
  const solarTime = moment.trueSolar;

  // 警示與約定：讓使用者與 AI 都知道哪些地方是近似、哪些是流派選擇
  const warnings = [];
  if (moment.tzNote) warnings.push(moment.tzNote);
  if (destiny.notes?.length) warnings.push(...destiny.notes);
  if (astro.warnings?.length) warnings.push(...astro.warnings);
  if (!timeKnown) warnings.push('出生時間不詳：時柱、紫微命盤、梅花下卦與動爻、占星上升與宮位皆無法確定，已不排（或僅以標示過的替代法呈現）。請盡量取得出生證明上的時間。');
  if (ziwei?.yearNote) warnings.push(ziwei.yearNote);
  if (hd.timeUncertainty) warnings.push(hd.timeUncertainty.note);
  if (timeKnown && c.lateZi) warnings.push(c.school === 'same'
    ? '出生於 23:00 之後（夜子時）：目前採「早晚子時」流派（日柱、農曆日不換，仍以當日計）；若你的命理師採「晚子時算次日」，結果會不同，可在表單切換。'
    : '出生於 23:00 之後（夜子時）：目前採「晚子時算次日」流派（日柱、農曆日與時辰皆以次日子時計）；若你的命理師採「早晚子時」（日柱不換），結果會不同，可在表單切換。');
  const pad = (n) => String(n).padStart(2, '0');
  const conventions = [
    `時間：出生地當地時間 ${r.year}/${r.month}/${r.day} ${pad(r.hour)}:${pad(r.minute)} → UTC${moment.tzHours >= 0 ? '+' : ''}${Number(moment.tzHours.toFixed(3))}（${moment.tzSource === 'override' ? '使用者指定' : moment.tzSource === 'iana' ? 'IANA 歷史時區' : '預設標準時區'}）`,
    `中式時辰：${!timeKnown ? '出生時間不詳（不論時辰）' : moment.useTrueSolar ? `採真太陽時 ${pad(solarTime.hour)}:${pad(solarTime.minute)}（經度差＋均時差；只影響時辰，日柱與農曆日仍以民用日期為準）` : '採鐘錶時間（台灣主流）'}；夜子時：${r.zishi === 'same' ? '早晚子時（日柱不換）' : '晚子時算次日'}`,
    '八字：年柱、月柱以太陽黃經真實交節時刻（立春 315° 起每 30°）換算；農曆採單一萬年曆（天文校正）；論命採子平扶抑法（簡化），大運依節令起運',
    '紫微：以上述農曆日期、時辰排盤；農曆正月初一換年（生年四化）；閏月採「十五日後視為下月」（fixLeap）；吉凶合看三方四正，並計大限／流年四化',
    `占星：回歸黃道、整宮制（未提供 Placidus 等其他宮位制）；相位納入十大行星、北交點與軸點（容許度依天體縮放）${astro.warnings?.length ? '（警示見上）' : ''}；人類圖：真交點、設計時刻為太陽回退 88°`,
  ];

  const profile = { name, gender, birth: r, moment, destiny, ziwei, astro, hd, bazi, timeKnown, solarTime, warnings, conventions };
  profile.cards = buildCards(profile);
  profile.elements = buildElementTally(profile);
  return profile;
}

function soulStarNames(ziwei) {
  return (ziwei?.corePalaces.soul?.majorStars || []).map((s) => s.name);
}

function buildElementTally(p) {
  // 各體系的「五行」定義與基礎不同（六爻納甲五行、紫微星曜五行、占星四元素），
  // 不能直接相加成同一個強弱分數。這裡改為「每個體系對每個五行最多投一票」，
  // 結果是「跨體系指向」而非八字式的五行旺衰。
  const bySystem = { 易經: new Set(), 紫微: new Set(), 占星: new Set() };
  const sources = [];
  const add = (sys, wx, label) => {
    if (wx && ['木', '火', '土', '金', '水'].includes(wx)) { bySystem[sys].add(wx); sources.push(`${label}${wx}`); }
  };
  const shi = p.destiny.linesData.find((l) => l.isShi);
  add('易經', shi?.wuxing, '世爻');
  add('易經', p.destiny.palaceInfo.palaceWuxing, '卦宮');
  const soulStar = soulStarNames(p.ziwei)[0];
  if (p.ziwei) add('紫微', STAR_WX[soulStar], `命宮${soulStar || ''}`);
  add('占星', ASTRO_TO_WX[p.astro.sun.sign.element], '太陽');
  if (!p.astro.moonSigns || p.astro.moonSigns[0].name === p.astro.moonSigns[1].name) add('占星', ASTRO_TO_WX[p.astro.moon.sign.element], '月亮');
  if (!p.astro.timeUnknown) add('占星', ASTRO_TO_WX[p.astro.asc.sign.element], '上升');
  const tally = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const set of Object.values(bySystem)) for (const wx of set) tally[wx] += 1;
  const max = Math.max(...Object.values(tally));
  const dominant = Object.keys(tally).filter((k) => tally[k] === max && max > 0);
  const missing = Object.keys(tally).filter((k) => tally[k] === 0);
  const caveat = '每個體系對每個五行至多算一票（共 3 個體系），僅為跨體系指向，不是八字五行旺衰；占星四元素對應五行（風→木）為類比，非傳統定義。';
  return { tally, dominant, missing, sources, bySystem: Object.fromEntries(Object.entries(bySystem).map(([k, v]) => [k, [...v]])), caveat, voters: p.ziwei ? 3 : 2 };
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
  const unk = a.timeUnknown;
  return [
    {
      key: 'iching', title: '易經命卦', accent: 'amber',
      headline: `${p.destiny.hexagrams.original.name}（${p.destiny.hexagrams.palace}）`,
      lines: [
        `世爻：${shi?.branch || ''}${shi?.wuxing || ''}行（${shi?.relation || ''}）`,
        `互卦：${p.destiny.hexagrams.nuclear.hex.name}`,
        `四柱：${p.destiny.meta.pillars}`,
        `日主 ${p.bazi.dayMaster.stem}${p.bazi.dayMaster.wx}・${p.bazi.strength.label}・${p.bazi.pattern.name}`,
      ],
    },
    z ? {
      key: 'ziwei', title: '紫微斗數', accent: 'purple',
      headline: `命宮 ${soulStarNames(z).join('、') || '無主星'}`,
      lines: [
        `${z.fiveElementsClass}｜命主 ${z.soul}｜身主 ${z.body}`,
        `官祿：${palaceLine(z.corePalaces.career)}`,
        `夫妻：${palaceLine(z.corePalaces.marriage)}`,
      ],
    } : {
      key: 'ziwei', title: '紫微斗數', accent: 'purple',
      headline: '需要出生時辰',
      lines: ['出生時間不詳，無法決定命宮，故不排盤。', '取得出生時間後即可排出完整命盤。'],
    },
    {
      key: 'astro', title: '西洋占星', accent: 'blue',
      headline: unk ? `${a.sun.sign.name}太陽（時間不詳，無上升）` : `${a.sun.sign.name}太陽・${a.moon.sign.name}月亮・${a.asc.sign.name}上升`,
      lines: unk ? [
        `太陽 ${a.sun.sign.degreeStr}`,
        a.moonSigns[0].name === a.moonSigns[1].name ? `月亮 ${a.moon.sign.name}（度數不準）` : `月亮 ${a.moonSigns[0].name} 或 ${a.moonSigns[1].name}（無法確定）`,
        '上升、天頂與宮位需要出生時間',
      ] : [
        `太陽 ${a.sun.sign.degreeStr}`,
        `月亮 ${a.moon.sign.degreeStr}`,
        `上升 ${a.asc.sign.degreeStr}｜天頂 ${a.mc.sign.name}`,
      ],
    },
    {
      key: 'hd', title: '人類圖', accent: 'emerald',
      headline: hd.timeUncertainty && !hd.timeUncertainty.typeStable ? `${hd.timeUncertainty.alt.join(' 或 ')}（時間不詳）` : `${hd.typeInfo.type} ${hd.profileInfo.profile}`,
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
  const planetNames = { sun: '太陽', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星', uranus: '天王星', neptune: '海王星', pluto: '冥王星', northNode: '北交點', asc: '上升', mc: '天頂' };
  const planets = Object.entries(planetNames)
    .filter(([id]) => !(a.timeUnknown && (id === 'asc' || id === 'mc')))
    .map(([id, n]) => `${n}${a.positions[id].sign.degreeStr}`).join('、');
  const majorAspects = a.aspects.filter((x) => x.nature === 'major').sort((x, y) => x.orb - y.orb).slice(0, 10)
    .map((x) => `${planetNames[x.planet1]}${x.name}${planetNames[x.planet2]}`).join('、');
  const mutagens = [];
  z?.raw.palaces.forEach((pl) => [...pl.majorStars, ...pl.minorStars].forEach((s) => {
    if (s.mutagen) mutagens.push(`${s.name}化${s.mutagen}（${pl.name}）`);
  }));
  const zText = z ? `- ${z.chineseDate}；${z.fiveElementsClass}；命主星 ${z.soul}、身主星 ${z.body}
- 命宮：${palaceLine(z.corePalaces.soul)}；身宮：${z.corePalaces.body?.name || ''}（${z.corePalaces.body?.earthlyBranch || ''}）
- 財帛：${palaceLine(z.corePalaces.wealth)}；官祿：${palaceLine(z.corePalaces.career)}；夫妻：${palaceLine(z.corePalaces.marriage)}；遷移：${palaceLine(z.corePalaces.travel)}
- 四化：${mutagens.join('、') || '見各宮'}` : '- 出生時間不詳，紫微無法排盤（不得杜撰命宮或星曜）。';
  const timeStr = p.birth.timeKnown ? `${String(p.birth.hour).padStart(2, '0')}:${String(p.birth.minute).padStart(2, '0')}` : '時間不詳';
  const el = p.elements;
  const caution = [...(p.conventions || []).map((x) => `· ${x}`), ...(p.warnings || []).map((x) => `⚠ ${x}`)].join('\n');

  return `您好，請同時以易經六爻命卦、紫微斗數、西洋占星心理學與人類圖四大體系大師的視角，為【${p.name}】（${p.gender}，${p.birth.year}/${p.birth.month}/${p.birth.day} ${timeStr}，${p.birth.city.name}）撰寫一份「全象本命．個人人格深度報告」。

【排盤約定與已知限制（請在解讀中遵守，勿過度確定）】
${caution}

【一、易經命卦】
- 四柱：${d.meta.pillars}；旬空：${d.meta.kongWang || '無'}
- 本命卦：${d.hexagrams.original.name}（${d.hexagrams.palace}）；互卦：${d.hexagrams.nuclear.hex.name}
- 世爻：${shi?.branch || ''}${shi?.wuxing || ''}行，${shi?.relation || ''}；世爻位置：${d.hexagrams.shiPosition}
- 性格：${d.personality.wuxingArchetype.title}。${d.personality.coreMindset}
- 事業：${d.career.roleOrientation}；財運：${d.wealth.wealthPattern}；情感：${d.relationship.shiYingDynamic}
- 八字論命（子平扶抑法・簡化）：
${baziToText(p.bazi).split('\n').map((l) => `  ${l}`).join('\n')}

【二、紫微斗數】
${zText}

【三、西洋占星】
- ${planets}
- 主要相位：${majorAspects || '無明顯大相位'}

【四、人類圖】
- 類型 ${hd.typeInfo.type}；策略 ${hd.typeInfo.strategy}；內在權威 ${hd.authority}；${hd.definition}；人生角色 ${hd.profileInfo.profile}（${hd.profileInfo.description}）
- 已定義中心：${Object.values(hd.centers).filter((c) => c.isDefined).map((c) => c.chName).join('、') || '無'}；開放中心：${Object.values(hd.centers).filter((c) => !c.isDefined).map((c) => c.chName).join('、') || '無'}
- 通道：${hd.definedChannels.map((c) => `${c.gates.join('-')}${c.shortName}`).join('、') || '無完整通道'}
- 意識太陽 Gate ${hd.conscious.sun.gate}.${hd.conscious.sun.line}、潛意識太陽 Gate ${hd.unconscious.sun.gate}.${hd.unconscious.sun.line}

【跨體系五行指向（每體系每五行至多一票，共 3 體系；非八字旺衰，占星元素對應為類比）】
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

export function compareZiwei(zA, zB, nA = 'A', nB = 'B') {
  if (!zA || !zB) return { score: null, notes: [{ tone: 'warn', text: '至少一方出生時間不詳，紫微無法排盤，本項不比較。' }], starA: null, starB: null, skipped: true };
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
  crossCheck(marA, soulB, nA, nB);
  crossCheck(marB, soulA, nB, nA);

  // 4. 對方命宮主星出現在我的夫妻宮
  const sameStar = (mar, soul, from, to) => {
    const hit = mar.filter((s) => soul.includes(s));
    if (hit.length) {
      score += 6 * hit.length;
      notes.push({ tone: 'good', text: `${to}的命宮主星（${hit.join('、')}）同時出現在${from}的夫妻宮，是「命中註定型」的星曜呼應。` });
    }
  };
  sameStar(marriageStarsOf(zA), soulStarNames(zB), nA, nB);
  sameStar(marriageStarsOf(zB), soulStarNames(zA), nB, nA);

  // 5. 夫妻宮四化
  for (const [who, mar] of [[nA, marA], [nB, marB]]) {
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

/** 把內部相對分數轉為五級定性（1–5），UI 只顯示等級，不顯示數字 */
export function levelOf(score) {
  const n = score >= 85 ? 5 : score >= 75 ? 4 : score >= 65 ? 3 : score >= 55 ? 2 : 1;
  return { level: n, levelLabel: ['', '張力較大', '需要磨合', '互補成長', '默契良好', '高度共鳴'][n] };
}

export function compareProfiles(pA, pB) {
  const shiA = pA.destiny.linesData.find((l) => l.isShi);
  const shiB = pB.destiny.linesData.find((l) => l.isShi);
  const iching = generateCompatibilityReport({
    personA: { name: pA.name, shiLine: shiA, palaceInfo: pA.destiny.palaceInfo, hexName: pA.destiny.hexagrams.original.name, report: pA.destiny },
    personB: { name: pB.name, shiLine: shiB, palaceInfo: pB.destiny.palaceInfo, hexName: pB.destiny.hexagrams.original.name, report: pB.destiny },
  });
  const ziwei = compareZiwei(pA.ziwei, pB.ziwei, pA.name, pB.name);
  const astro = calculateSynastry(pA.astro, pB.astro);
  const hd = compareHumanDesign(pA.hd, pB.hd, pA.name, pB.name);

  // 各系統內部以自訂規則計分，只能當相對參考：對外只呈現五級定性，不顯示精確分數（避免假精確）
  // 八字合婚（日干五合、日支合沖刑害、生肖、用神互補）是傳統合婚的核心，權重上與其他體系並列
  const bazi = compareBazi(pA.destiny.pillarsRaw, pB.destiny.pillarsRaw, pA.bazi, pB.bazi, pA.name, pB.name);
  const dims = [
    { key: 'bazi', label: '八字合婚', score: bazi.score },
    { key: 'iching', label: '易經世應', score: clamp(iching.score, 30, 98) },
    ...(ziwei.skipped ? [] : [{ key: 'ziwei', label: '紫微命夫妻', score: ziwei.score }]),
    { key: 'astro', label: '占星合盤', score: astro.score },
    { key: 'hd', label: '人類圖通道', score: hd.score },
  ].map((d) => ({ ...d, ...levelOf(d.score) }));
  const overall = clamp(dims.reduce((s, d) => s + d.score, 0) / dims.length, 30, 98);
  return { overall, ...tierOf(overall), ...levelOf(overall), dims, bazi, iching, ziwei, astro, hd };
}

export function generatePairPrompt(pA, pB, cmp) {
  const hdLine = (arr) => arr.map((c) => `${c.gates.join('-')}${c.shortName}（${c.who}）`).join('、') || '無';
  const astroLine = cmp.astro.aspects.slice(0, 10).map((x) => `A${x.labelA}${x.name}B${x.labelB}`).join('、') || '無明顯跨盤相位';
  const zNotes = cmp.ziwei.notes.map((n) => n.text).join(' ');
  const brief = (p) => `${p.name}（${p.gender}）：${p.destiny.hexagrams.original.name}卦／${p.ziwei ? `命宮${soulStarNames(p.ziwei).join('、') || '無主星'}` : '紫微（時間不詳，未排）'}／${p.astro.timeUnknown ? `${p.astro.sun.sign.name}太陽（無上升）` : `${p.astro.sun.sign.name}太陽・${p.astro.moon.sign.name}月亮・${p.astro.asc.sign.name}上升`}／${p.hd.typeInfo.type} ${p.hd.profileInfo.profile}${p.hd.timeUncertainty && !p.hd.timeUncertainty.typeStable ? '（類型待確認）' : ''}`;

  return `您好，請同時以易經、紫微斗數、西洋占星與人類圖大師的視角，為下列兩人撰寫「太極同心．雙人全維合盤契合報告」。

【雙方概況】
- A｜${brief(pA)}
- B｜${brief(pB)}

【系統計算結果】
- 綜合傾向：${cmp.tier}（${cmp.levelLabel}）；各維度：${cmp.dims.map((d) => `${d.label}：${d.levelLabel}`).join('、')}（規則式相對評估，非精確分數，請勿當作吉凶定論）
- 八字合婚：${cmp.bazi.notes.map((n) => n.text).join(' ') || '日柱無明顯合沖'}
- 易經：${cmp.iching.dynamicSummary}｜亮點：${cmp.iching.synergyPoints?.join('；') || '互補'}｜摩擦：${cmp.iching.frictionPoints?.join('；') || '需磨合'}
- 紫微：${zNotes || '無特別呼應'}
- 占星跨盤相位：${astroLine}；主題傾向 ${Object.entries(cmp.astro.themeScore).map(([k, v]) => `${k}${levelOf(v).levelLabel}`).join('、')}
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

// ───────────────────── 各系統 Prompt（不含角色設定，角色由 SmartReading 指定） ─────────────────────
export function generateIchingPrompt(p) {
  const d = p.destiny;
  const shi = d.linesData.find((l) => l.isShi);
  return `請為命主【${p.name}】解讀易經六爻終身命卦並提供深刻且具體的人生指引：

【命卦盤面】
- 四柱八字：${d.meta.pillars}；旬空：${d.meta.kongWang || '無'}
- 本命卦：${d.hexagrams.original.name}（${d.hexagrams.palace}）；卦辭：${d.hexagrams.original.text}
- 互卦：${d.hexagrams.nuclear.hex.name}
- 世爻：${d.hexagrams.shiPosition}；應爻：${d.hexagrams.yingPosition}
- 六爻：${[...d.linesData].reverse().map((l) => `${l.lineNum}爻${l.bit ? '陽' : '陰'}${l.branch}${l.wuxing}(${l.relation}・${l.beast})${l.isShi ? '【世】' : ''}${l.isYing ? '【應】' : ''}`).join('、')}

【八字論命（子平扶抑法・簡化，請據此論述，不要自行另起用神）】
${baziToText(p.bazi)}

【系統算法摘要】
- 性格：${d.personality.wuxingArchetype.title}。${d.personality.coreMindset}
- 盲點：${d.personality.blindSpots}
- 事業：${d.career.roleOrientation}；財運：${d.wealth.wealthPattern}
- 情感：${d.relationship.shiYingDynamic}
- 身心：${d.health.organSystem}
- 開運：${d.luckyKit.color}、數字 ${d.luckyKit.numbers}、方位 ${d.luckyKit.direction}（${shi?.wuxing || ''}行）

請依序解析：
1. 【命格本質與思維盲區】
2. 【黃金事業賽道與決策心法】
3. 【聚財守財與漏財防範】
4. 【情感與人際相處之道】
5. 【身心養護與人生座右銘】`;
}

/** 融合總論（三家）：紫微 × 人類圖 × 西洋占星 */
export function generateFusionPrompt(p) {
  const d = generateUnifiedPrompt(p);
  const data = d.slice(0, d.indexOf('【請依下列結構撰寫'));
  let body = data.replace(/^[^\n]*\n\n/, '');
  body = body.replace(/【一、易經命卦】[\s\S]*?(?=【二、紫微斗數】)/, '')
    .replace('【二、紫微斗數】', '【一、紫微斗數】').replace('【三、西洋占星】', '【二、西洋占星】').replace('【四、人類圖】', '【三、人類圖】');
  const rule = fusionSummaryAsText(buildFusionSummary(p));
  return `請為【${p.name}】撰寫「紫微斗數 × 人類圖 × 西洋占星」三家融合總論。

${body}
【系統已整理的初步共識（供參考，可修正）】
${rule}

【請依下列結構撰寫（總字數建議三千至五千字，用流暢白話重新組織，不要逐系統條列）】
一、總論（約 500 字）：用一段完整的文字說出此人的本命底色、核心動力與整體人生主題。
二、三家共識：列出三家都指向的 3–4 個特質，每項註明紫微、占星、人類圖各自的證據。
三、矛盾與整合：三家說法不同之處，以及如何在生活中整合。
四、天賦與事業財運、情感關係、身心能量（各一段，註明主要依據）。
五、最大的天賦與最需修煉的課題各三點。
六、未來十二個月的行動清單（五到七條）與一句座右銘。

語氣溫暖專業，結論要具體；體系間說法不同時請明說，不要為了湊結論而美化，也不鐵口直斷吉凶。`;
}
