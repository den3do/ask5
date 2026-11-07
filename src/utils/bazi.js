/**
 * 八字論命層：藏干、十神、五行強弱、日主強弱、格局、用神（扶抑法）、大運、流年
 *
 * 排盤（四柱）仍由 lunar.js 的 calculatePillars 提供；此模組只做「論」。
 * 方法為傳統「子平」常見的簡化版：
 *   - 五行強弱以「天干＋地支藏干」加權，月令權重最高
 *   - 用神以「扶抑法」為主，另附調候提示；不處理從格、化格、通關等特殊格局
 *   - 大運起運依「陽男陰女順行、陰男陽女逆行」，以出生到最近節令的天數 ÷ 3 為起運歲數
 * 結果為「參考級」判斷，會在 notes 中明講限制，請勿當作鐵口直斷。
 */
import { bodyLongitude, findSunLongitudeTime, norm360 } from './ephemeris.js';
import { baziYearOf } from './lunar.js';

// 三合局（生旺墓）與半合；地支害、破、刑
const SAN_HE = [
  { b: ['申', '子', '辰'], wx: '水' }, { b: ['亥', '卯', '未'], wx: '木' },
  { b: ['寅', '午', '戌'], wx: '火' }, { b: ['巳', '酉', '丑'], wx: '金' },
];
const HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const PO = { 子: '酉', 酉: '子', 午: '卯', 卯: '午', 巳: '申', 申: '巳', 寅: '亥', 亥: '寅', 辰: '丑', 丑: '辰', 戌: '未', 未: '戌' };
const XING_PAIRS = [['子', '卯'], ['寅', '巳'], ['巳', '申'], ['寅', '申'], ['丑', '戌'], ['戌', '未'], ['丑', '未']];
const SELF_XING = ['辰', '午', '酉', '亥'];

/** 運／流年地支與原局各柱地支的沖、合、半合、刑、害、破 */
function branchInteractions(branch, natal) {
  const flags = [];
  for (const nb of natal) {
    if (CLASH[branch] === nb.b) flags.push(`沖${nb.pos}（${nb.b}）`);
    if (HE6[branch] === nb.b) flags.push(`合${nb.pos}（${nb.b}）`);
    if (HAI[branch] === nb.b) flags.push(`害${nb.pos}（${nb.b}）`);
    if (PO[branch] === nb.b) flags.push(`破${nb.pos}（${nb.b}）`);
    if (XING_PAIRS.some(([x, y]) => (x === branch && y === nb.b) || (y === branch && x === nb.b))) flags.push(`刑${nb.pos}（${nb.b}）`);
    if (branch === nb.b && SELF_XING.includes(branch)) flags.push(`自刑${nb.pos}（${nb.b}）`);
    const g = SAN_HE.find((s) => s.b.includes(branch) && s.b.includes(nb.b) && branch !== nb.b);
    if (g) flags.push(`與${nb.pos}（${nb.b}）半合${g.wx}局`);
  }
  // 原局已有兩支者，運／流年補足第三支＝成局
  const nset = new Set(natal.map((n) => n.b));
  for (const s of SAN_HE) {
    if (s.b.includes(branch) && s.b.filter((x) => x !== branch).every((x) => nset.has(x))) flags.push(`三合${s.wx}局`);
  }
  return flags;
}

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const BRANCH_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

// 地支藏干（本氣、中氣、餘氣）
const HIDDEN = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'],
  酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};
const HIDDEN_W = [1, 0.5, 0.3];
const CLASH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const HE6 = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const LU = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const REN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }; // 陽干羊刃

const sIdx = (s) => STEMS.indexOf(s);
const yang = (s) => sIdx(s) % 2 === 0;
const wxOfStem = (s) => STEM_WX[sIdx(s)];

/** 十神：以日主 dm 看另一天干 o */
export function tenGod(dm, o) {
  const a = wxOfStem(dm); const b = wxOfStem(o);
  const same = yang(dm) === yang(o);
  if (a === b) return same ? '比肩' : '劫財';
  if (GEN[a] === b) return same ? '食神' : '傷官';
  if (KE[a] === b) return same ? '偏財' : '正財';
  if (KE[b] === a) return same ? '七殺' : '正官';
  return same ? '偏印' : '正印'; // GEN[b] === a
}
const GROUP_OF = { 比肩: '比劫', 劫財: '比劫', 食神: '食傷', 傷官: '食傷', 偏財: '財', 正財: '財', 七殺: '官殺', 正官: '官殺', 偏印: '印', 正印: '印' };

/** 十神群 → 五行（以日主為準） */
function groupElements(dm) {
  const a = wxOfStem(dm);
  const inv = Object.keys(GEN).find((k) => GEN[k] === a);
  const killer = Object.keys(KE).find((k) => KE[k] === a);
  return { 比劫: a, 食傷: GEN[a], 財: KE[a], 官殺: killer, 印: inv };
}

const parse = (gz) => (gz && gz.length === 2 && STEMS.includes(gz[0]) && BRANCHES.includes(gz[1]) ? [gz[0], gz[1]] : null);

/**
 * @param {Object} pillars  calculatePillars() 的結果
 * @param {Object} opts { gender:'男'|'女', utc:Date, nowYear?:number }
 */
export function analyzeBazi(pillars, opts = {}) {
  const gender = opts.gender === '女' ? '女' : '男';
  // 流年以「立春」換年（八字年），大運以起運的精確日期換運，不用西曆年
  const nowDate = opts.now instanceof Date ? opts.now : new Date();
  const nowYear = opts.nowYear || baziYearOf(nowDate);
  const cols = [
    { pos: '年柱', gz: parse(pillars.year) },
    { pos: '月柱', gz: parse(pillars.month) },
    { pos: '日柱', gz: parse(pillars.day) },
    { pos: '時柱', gz: parse(pillars.hour) }, // 時辰不詳時為 null
  ];
  const dm = cols[2].gz[0];
  const dmWx = wxOfStem(dm);
  const notes = [];
  if (!cols[3].gz) notes.push('出生時辰不詳：時柱缺漏，五行強弱、日主強弱與用神皆只以三柱估算，可信度降低；大運起運歲數亦會因出生時刻不確定而有誤差。');

  // 藏干與十神
  const pillarsOut = cols.map((c) => {
    if (!c.gz) return { pos: c.pos, empty: true };
    const [s, b] = c.gz;
    return {
      pos: c.pos, stem: s, branch: b,
      stemTen: c.pos === '日柱' ? '日主' : tenGod(dm, s),
      hidden: HIDDEN[b].map((h, i) => ({ stem: h, wx: wxOfStem(h), ten: tenGod(dm, h), weight: HIDDEN_W[i] })),
    };
  });

  // 五行加權：天干 1（月干 1.2）；地支依月令最重（年 1、月 2.5、日 1.5、時 1），藏干按本中餘分配
  const BRANCH_POS_W = { 年柱: 1, 月柱: 2.5, 日柱: 1.5, 時柱: 1 };
  const wx = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const grp = { 比劫: 0, 食傷: 0, 財: 0, 官殺: 0, 印: 0 };
  const add = (stem, w) => { wx[wxOfStem(stem)] += w; grp[GROUP_OF[tenGod(dm, stem)] || '比劫'] += w; };
  for (const p of pillarsOut) {
    if (p.empty) continue;
    if (p.pos !== '日柱') add(p.stem, p.pos === '月柱' ? 1.2 : 1);
    else { wx[dmWx] += 1; grp.比劫 += 1; }
    const norm = p.hidden.reduce((n, h) => n + h.weight, 0);
    for (const h of p.hidden) add(h.stem, (BRANCH_POS_W[p.pos] * h.weight) / norm);
  }
  const total = Object.values(wx).reduce((a, b) => a + b, 0);
  const pct = (v) => Math.round((v / total) * 100);
  const wxPct = Object.fromEntries(Object.entries(wx).map(([k, v]) => [k, pct(v)]));
  const grpPct = Object.fromEntries(Object.entries(grp).map(([k, v]) => [k, pct(v)]));

  // 日主強弱：比劫＋印 的占比；月令是否得令另計
  const monthBranch = cols[1].gz[1];
  const monthMain = HIDDEN[monthBranch][0];
  const monthWx = wxOfStem(monthMain);
  const deLing = monthWx === dmWx || GEN[monthWx] === dmWx;
  const support = (grp.比劫 + grp.印) / total;
  const ratio = Math.round(support * 100);
  // 通根：日主五行或其生我之五行，在各地支藏干中的力量（月令最重）
  let root = 0;
  for (const p of pillarsOut) {
    if (p.empty) continue;
    for (const h of p.hidden) {
      if (h.wx === dmWx) root += BRANCH_POS_W[p.pos] * h.weight;
    }
  }
  const hasRoot = root >= 0.75;
  // 強弱指數：占比為底，月令得失（子平最重）±12，有無通根 +6／−8
  const strengthIndex = ratio + (deLing ? 12 : -12) + (hasRoot ? 6 : -8);
  let label;
  if (strengthIndex >= 64) label = '身強';
  else if (strengthIndex >= 50) label = '偏強';
  else if (strengthIndex >= 38) label = '偏弱';
  else label = '身弱';
  const strong = strengthIndex >= 50;
  // 從格徵兆：不得令、無根、印比極少 → 傳統需改論「從」，本模組不處理，僅明示
  const maybeFollow = !deLing && !hasRoot && support < 0.2;
  if (maybeFollow) notes.push(`日主${dm}不得令、無通根、印比僅占 ${ratio}%，有「從格」徵兆：扶抑法在此會失準（傳統應順其強勢五行取用），本結果僅供參考，建議請命理師複核。`);
  // 格局：月令藏干透出者優先（本氣 > 中氣 > 餘氣），否則取本氣
  // 透干：年干、時干（月干另計）；日主自身不算「透出」
  const visible = cols.filter((c, i) => c.gz && i !== 1 && i !== 2).map((c) => c.gz[0]);
  const monthStemVisible = cols[1].gz[0];
  const hiddenOrder = HIDDEN[monthBranch];
  const isBiJie = (h) => GROUP_OF[tenGod(dm, h)] === '比劫';
  // 建祿、月刃：月令本氣為比劫且恰在日主祿／刃位；其餘比劫不成格，改取月令藏干中透出的非比劫者（再退而取本氣以外第一個非比劫）
  let patternName;
  if (LU[dm] === monthBranch) patternName = '建祿格';
  else if (REN[dm] === monthBranch) patternName = '月刃格';
  else {
    const cands = hiddenOrder.filter((h) => !isBiJie(h));
    const pick = cands.find((h) => h === monthStemVisible || visible.includes(h)) || cands[0] || hiddenOrder[0];
    patternName = `${tenGod(dm, pick)}格`;
  }
  const patternNote = {
    正官格: '重規矩、名分與責任，適合體制與管理路線。', 七殺格: '有魄力與壓力並存，宜有制化（食神制殺或印化殺）。',
    正財格: '務實穩健、重積累，財來自本業與勤勉。', 偏財格: '善於把握機會與人脈，財路較活但起伏較大。',
    正印格: '重學習、名譽與庇蔭，宜安穩求進。', 偏印格: '思路特殊、偏才技藝，需防孤僻與多慮。',
    食神格: '才藝、口福與表達，性情溫和，宜發揮專長。', 傷官格: '才華外露、不喜拘束，宜以專業立身並留意言語。',
    建祿格: '自立自強，靠自己打拼，宜用財官食傷來洩耗。', 月刃格: '個性剛烈、競爭力強，需有官殺制衡。',
    比肩格: '重自我與同儕，合作與分財是課題。', 劫財格: '社交與競爭力強，需防破財與合夥糾紛。',
  }[patternName] || '';

  // 用神（扶抑法）
  const ge = groupElements(dm);
  let favorGroups; let unfavorGroups; let primaryGroup;
  if (strong) {
    unfavorGroups = ['比劫', '印'];
    if (grp.比劫 >= grp.印) primaryGroup = grp.官殺 > 0 ? '官殺' : (grp.食傷 > 0 ? '食傷' : '財');
    else primaryGroup = grp.財 > 0 ? '財' : (grp.食傷 > 0 ? '食傷' : '官殺');
    favorGroups = [primaryGroup, ...['官殺', '食傷', '財'].filter((g) => g !== primaryGroup)];
  } else {
    unfavorGroups = ['食傷', '財', '官殺'];
    primaryGroup = grp.官殺 >= grp.食傷 + grp.財 ? '印' : (grp.印 <= grp.比劫 ? '印' : '比劫');
    favorGroups = [primaryGroup, ...['印', '比劫'].filter((g) => g !== primaryGroup)];
  }
  // 太旺的喜神（占比超過四分之一）不再當作「補」的對象
  let favorable = [...new Set(favorGroups.filter((g) => grpPct[g] < 28 || g === primaryGroup).map((g) => ge[g]))];
  let unfavorable = [...new Set(unfavorGroups.map((g) => ge[g]))].filter((e) => !favorable.includes(e));
  // 調候：寒暖燥濕失衡時，調候五行優先（冬生急火、夏生急水），並從忌神中移除；
  // 該五行在原局已過旺（占比 ≥ 30%）則不再補。
  const tiaohouEl = ['亥', '子', '丑'].includes(monthBranch) ? '火' : ['巳', '午', '未'].includes(monthBranch) ? '水' : '';
  const tiaohou = !tiaohouEl ? '' : tiaohouEl === '火'
    ? '生於冬月，寒濕偏重，命局宜見火暖局（調候：火，已列為優先喜用）。'
    : '生於夏月，燥熱偏重，命局宜見水潤局（調候：水，已列為優先喜用）。';
  if (tiaohouEl && wxPct[tiaohouEl] < 30) {
    favorable = [tiaohouEl, ...favorable.filter((e) => e !== tiaohouEl)];
    unfavorable = unfavorable.filter((e) => e !== tiaohouEl);
  }
  const yongshen = {
    primary: ge[primaryGroup], primaryGroup, favorable, unfavorable, tiaohou, tiaohouElement: tiaohouEl || null,
    method: '扶抑法為本（以得令＋通根＋印比占比定強弱）、調候為輔；身強取官殺、食傷、財洩耗制衡，身弱取印、比劫生扶。未處理從格、化格、通關、病藥。',
  };
  const favSet = new Set(favorable); const unfavSet = new Set(unfavorable);
  const wxTone = (e) => (favSet.has(e) ? 1 : unfavSet.has(e) ? -1 : 0);
  // 地支以藏干按本中餘氣加權判吉凶（不再把丑辰未戌一律當土）
  const branchTone = (b) => {
    const hs = HIDDEN[b]; const norm = HIDDEN_W.slice(0, hs.length).reduce((a, c) => a + c, 0);
    return hs.reduce((s, h, i) => s + wxTone(wxOfStem(h)) * (HIDDEN_W[i] / norm), 0);
  };
  const toneOf = (stemWx, branch) => {
    const v = wxTone(stemWx) + branchTone(branch);
    return v >= 0.6 ? 'good' : v <= -0.6 ? 'bad' : 'mid';
  };
  // 大運／流年地支與原局的刑沖合害，會削減或放大吉凶：沖／刑／害／破降一級，其餘不變
  const natalForTone = cols.filter((c) => c.gz).map((c) => ({ pos: c.pos, b: c.gz[1] }));
  const adjust = (tone, branch) => {
    const hits = branchInteractions(branch, natalForTone).filter((f) => /^(沖|刑|害|破|自刑)/.test(f)).length;
    if (!hits) return tone;
    return tone === 'good' ? 'mid' : tone;
  };

  // 大運
  let luck = null;
  if (opts.utc instanceof Date && !Number.isNaN(opts.utc.getTime())) {
    const yStem = cols[0].gz[0];
    const forward = (yang(yStem) && gender === '男') || (!yang(yStem) && gender === '女');
    const sunLon = bodyLongitude('sun', opts.utc);
    const since = norm360(sunLon - 315);
    const jieMonth = Math.floor(since / 30);
    const within = since % 30;
    const targetLon = norm360(315 + 30 * (forward ? jieMonth + 1 : jieMonth));
    const guess = new Date(opts.utc.getTime() + (forward ? (30 - within) : -within) / 0.9856 * 86400000);
    const jie = findSunLongitudeTime(targetLon, guess);
    const diffDays = Math.abs(jie.getTime() - opts.utc.getTime()) / 86400000;
    const totalMonths = diffDays * 4; // 3 天 = 1 年，1 天 = 4 個月
    const sy = Math.floor(totalMonths / 12);
    const sm = Math.floor(totalMonths % 12);
    const sd = Math.floor(((totalMonths % 12) - sm) * 30);
    const birthYear = opts.utc.getUTCFullYear();
    const startDate = new Date(Date.UTC(birthYear + sy, opts.utc.getUTCMonth() + sm, opts.utc.getUTCDate() + sd));
    const startYear = startDate.getUTCFullYear();
    const mStemIdx = sIdx(cols[1].gz[0]);
    const mBranchIdx = BRANCHES.indexOf(monthBranch);
    const dir = forward ? 1 : -1;
    const cycles = [];
    for (let k = 1; k <= 9; k += 1) {
      const si = (((mStemIdx + dir * k) % 10) + 10) % 10;
      const bi = (((mBranchIdx + dir * k) % 12) + 12) % 12;
      const stem = STEMS[si]; const branch = BRANCHES[bi];
      const mainHidden = HIDDEN[branch][0];
      const from = startYear + (k - 1) * 10;
      // 以起運的精確日期換運（交脫運不在 1/1）
      const fromDate = new Date(Date.UTC(startDate.getUTCFullYear() + (k - 1) * 10, startDate.getUTCMonth(), startDate.getUTCDate()));
      const toDate = new Date(Date.UTC(startDate.getUTCFullYear() + k * 10, startDate.getUTCMonth(), startDate.getUTCDate()));
      cycles.push({
        gz: `${stem}${branch}`, ageFrom: sy + (k - 1) * 10, ageTo: sy + k * 10 - 1, yearFrom: from, yearTo: from + 9,
        fromDate, toDate,
        stemTen: tenGod(dm, stem), branchTen: tenGod(dm, mainHidden),
        flags: branchInteractions(branch, natalForTone),
        tone: adjust(toneOf(STEM_WX[si], branch), branch), current: nowDate >= fromDate && nowDate < toDate,
      });
    }
    luck = {
      direction: forward ? '順行' : '逆行',
      jieTime: jie, startAge: { years: sy, months: sm, days: sd }, startYear, cycles,
      note: `${yang(yStem) ? '陽' : '陰'}年${gender}命${forward ? '順' : '逆'}排大運；出生距${forward ? '下' : '上'}一個節令約 ${diffDays.toFixed(1)} 天，三天折一歲，約 ${sy} 歲 ${sm} 個月起運。`,
    };
    if (diffDays < 1) notes.push('出生時刻距節令不到一天，起運歲數對出生時間極為敏感。');
  }

  // 流年（今年起五年）：十神、與原局地支的沖合
  const natalBranches = cols.filter((c) => c.gz).map((c) => ({ pos: c.pos, b: c.gz[1] }));
  const years = [];
  for (let y = nowYear; y < nowYear + 5; y += 1) {
    const idx = (((y - 4) % 60) + 60) % 60;
    const stem = STEMS[idx % 10]; const branch = BRANCHES[idx % 12];
    const flags = branchInteractions(branch, natalBranches);
    years.push({
      year: y, gz: `${stem}${branch}`, stemTen: tenGod(dm, stem), branchTen: tenGod(dm, HIDDEN[branch][0]),
      tone: adjust(toneOf(STEM_WX[idx % 10], branch), branch), flags,
    });
  }

  notes.push('此為子平論命（扶抑為本、調候為輔）：不含從格／化格／通關／病藥與神煞；流年以立春換年、大運以起運精確日期換運。請當作參考，重大決定仍以專業命理師面談為準。');

  return {
    dayMaster: { stem: dm, wx: dmWx, yinyang: yang(dm) ? '陽' : '陰', gender },
    pillars: pillarsOut,
    elements: { counts: wx, pct: wxPct, groups: grpPct },
    strength: { label, ratio, deLing, monthBranch, hasRoot, index: strengthIndex, maybeFollow },
    pattern: { name: patternName, note: patternNote },
    yongshen, luck, years, notes,
  };
}

const STEM_HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };

/**
 * 八字合婚（傳統核心）：日干五合、日支（夫妻宮）合沖刑害破、年支（生肖）三合六合相沖、
 * 日主五行生剋，以及彼此日支五行是否為對方的喜用／忌神。
 * 分數只作內部相對排序，對外請只呈現五級定性。
 */
export function compareBazi(pa, pb, bzA, bzB, nA = 'A', nB = 'B') {
  const notes = [];
  let score = 60;
  const add = (v, tone, text) => { score += v; notes.push({ tone, text }); };
  const [dA, dB] = [pa.dayStem, pb.dayStem];
  if (STEM_HE[dA] === dB) add(8, 'good', `日干${dA}${dB}相合：天干互相吸引，感情上容易有「對上眼」的緣分。`);
  const [bA, bB] = [pa.dayBranch, pb.dayBranch];
  if (HE6[bA] === bB) add(8, 'good', `日支${bA}${bB}六合：夫妻宮相合，相處自然融洽、願意互相遷就。`);
  if (CLASH[bA] === bB) add(-8, 'warn', `日支${bA}${bB}相沖：夫妻宮相沖，個性與生活節奏容易正面碰撞，需要刻意留餘地。`);
  if (XING_PAIRS.some(([x, y]) => (x === bA && y === bB) || (y === bA && x === bB)) || (bA === bB && SELF_XING.includes(bA))) add(-5, 'warn', `日支${bA}${bB}相刑：相處易有摩擦或彼此挑剔，宜多溝通。`);
  if (HAI[bA] === bB) add(-4, 'warn', `日支${bA}${bB}相害：細節上易有誤會與暗傷，需主動澄清。`);
  if (PO[bA] === bB) add(-2, 'warn', `日支${bA}${bB}相破：關係中偶有小破損，影響不大。`);
  const gHe = SAN_HE.find((s) => s.b.includes(bA) && s.b.includes(bB) && bA !== bB);
  if (gHe) add(4, 'good', `日支${bA}${bB}同屬${gHe.wx}局（半合）：氣場相近，容易有共同目標。`);
  const [yA, yB] = [pa.yearBranch, pb.yearBranch];
  if (HE6[yA] === yB) add(3, 'good', `生肖${yA}${yB}六合，家庭與長輩關係易有助力。`);
  else if (CLASH[yA] === yB) add(-3, 'warn', `生肖${yA}${yB}相沖，與雙方家庭、價值觀上需要多磨合。`);
  else if (SAN_HE.some((s) => s.b.includes(yA) && s.b.includes(yB) && yA !== yB)) add(3, 'good', `生肖${yA}${yB}三合，大方向容易一致。`);
  const wA = wxOfStem(dA); const wB = wxOfStem(dB);
  if (GEN[wA] === wB || GEN[wB] === wA) add(3, 'good', `日主${wA}${wB}相生：一方自然滋養另一方。`);
  else if (KE[wA] === wB || KE[wB] === wA) add(-2, 'warn', `日主${wA}${wB}相剋：一方易壓過另一方，宜互相尊重。`);
  else if (wA === wB) add(1, 'good', `日主同屬${wA}：同類相惜，但也容易硬碰硬。`);
  // 用神互補：對方的夫妻宮（日支）五行，是否為自己的喜用／忌神
  const spouseWx = (b) => BRANCH_WX[BRANCHES.indexOf(b)];
  const fit = (who, bz, otherBranch, otherName) => {
    if (!bz) return;
    const el = spouseWx(otherBranch);
    if (bz.yongshen.favorable.includes(el)) add(3, 'good', `${otherName}的日支屬${el}，正是${who}的喜用，在一起有補益。`);
    else if (bz.yongshen.unfavorable.includes(el)) add(-3, 'warn', `${otherName}的日支屬${el}，落在${who}的忌神，相處時${who}易感到耗損。`);
  };
  fit(nA, bzA, bB, nB);
  fit(nB, bzB, bA, nA);
  return { score: Math.max(35, Math.min(96, score)), notes };
}

/** 供 AI prompt 與畫面使用的簡短文字 */
export function baziToText(b) {
  if (!b) return '';
  const lines = [];
  lines.push(`日主：${b.dayMaster.stem}${b.dayMaster.wx}（${b.dayMaster.yinyang}）；${b.strength.label}（比劫＋印占 ${b.strength.ratio}%，${b.strength.deLing ? '得令' : '不得令'}，${b.strength.hasRoot ? '有通根' : '無通根'}，月令${b.strength.monthBranch}）；${b.pattern.name}`);
  lines.push(`四柱十神：${b.pillars.filter((p) => !p.empty).map((p) => `${p.pos}${p.stem}${p.branch}（${p.stemTen}；藏干 ${p.hidden.map((h) => `${h.stem}${h.ten}`).join('、')}）`).join('；')}`);
  lines.push(`五行占比：${Object.entries(b.elements.pct).map(([k, v]) => `${k}${v}%`).join(' ')}；十神群：${Object.entries(b.elements.groups).map(([k, v]) => `${k}${v}%`).join(' ')}`);
  lines.push(`用神（扶抑法）：${b.yongshen.primary}（${b.yongshen.primaryGroup}）；喜：${b.yongshen.favorable.join('、') || '無'}；忌：${b.yongshen.unfavorable.join('、') || '無'}${b.yongshen.tiaohou ? `；${b.yongshen.tiaohou}` : ''}`);
  if (b.luck) {
    lines.push(`大運：${b.luck.note}`);
    lines.push(`大運序列：${b.luck.cycles.map((c) => `${c.ageFrom}歲起${c.gz}（${c.stemTen}/${c.branchTen}，${c.yearFrom}–${c.yearTo}${c.current ? '，目前' : ''}）`).join('、')}`);
  }
  lines.push(`近五年流年：${b.years.map((y) => `${y.year}${y.gz}（${y.stemTen}${y.flags.length ? `；${y.flags.join('、')}` : ''}）`).join('、')}`);
  lines.push(`限制：${b.notes.join(' ')}`);
  return lines.join('\n');
}
