/**
 * 唯心宗命卦 × 流年／流月 吉凶（本站整合法，非唯心宗官方算法）
 *
 * 以命卦的六爻納甲盤為「本命」，把流年地支當太歲、每個節氣月的地支當月建，比對：
 *   1. 世爻（代表自己）在太歲／月建下的旺相休囚死
 *   2. 太歲／月建與世爻的沖（歲破／月破）、合、刑，以及臨太歲／臨月建
 *   3. 上卦（外在）、下卦（內在）的五行與月五行的生剋 → 外運、內運
 *   4. 月建五行對卦宮是何六親 → 當月主題
 *   5. 生肖（農曆生年地支）與太歲的值、沖、刑、害、破（民俗犯太歲）
 * 分數只用來分級，對外呈現吉／小吉／平／小凶／凶與判斷依據。
 */
import { TRIGRAMS, STEMS, BRANCHES, BRANCH_WUXING } from '../data/constants.js';
import { getWuxingWangShuai, getRelation, buildDivinationBoard, evaluateDivination, detectSpecialPatterns } from './iching.js';
import { findSunLongitudeTime } from './ephemeris.js';
import { baziYearOf, calculatePillars } from './lunar.js';
import { chineseClock } from './chineseTime.js';

const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const CLASH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const HE6 = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const PO = { 子: '酉', 酉: '子', 午: '卯', 卯: '午', 巳: '申', 申: '巳', 寅: '亥', 亥: '寅', 辰: '丑', 丑: '辰', 戌: '未', 未: '戌' };
const XING = [['子', '卯'], ['寅', '巳'], ['巳', '申'], ['寅', '申'], ['丑', '戌'], ['戌', '未'], ['丑', '未']];
const SELF_XING = ['辰', '午', '酉', '亥'];
const isXing = (a, b) => XING.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) || (a === b && SELF_XING.includes(a));
const ZODIAC = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龍', 巳: '蛇', 午: '馬', 未: '羊', 申: '猴', 酉: '雞', 戌: '狗', 亥: '豬' };
const LUNAR_MONTH = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月'];

export const LEVELS = ['凶', '小凶', '平', '小吉', '吉'];
export function levelOf(score) {
  if (score >= 3) return '吉';
  if (score >= 1) return '小吉';
  if (score > -1) return '平';
  if (score > -3) return '小凶';
  return '凶';
}

/** 六親 → 主題（月建或年干落在卦宮的哪一種六親） */
function themeOf(relation, gender) {
  const t = {
    妻財: `財務、交易與業務往來${gender === '男' ? '；男命也主感情' : ''}`,
    官鬼: `工作壓力、考核、規範與是非${gender === '女' ? '；女命也主感情' : ''}`,
    父母: '文書、契約、長輩、房屋與學習',
    子孫: '休閒、子女與創意，有解憂之象',
    兄弟: '同儕、競爭與開銷',
  };
  return t[relation] || '';
}

/** 當月主題六親 × 吉凶（吉／小吉、平、小凶／凶）→ 建議 */
const ADVICE = {
  妻財: ['適合談生意、收款、開源。', '收支照計畫走即可。', '避免大額支出與借貸，帳目多核對。'],
  官鬼: ['適合爭取表現、升遷與考核。', '做好本分、守規矩。', '工作壓力大，防是非與文書疏失。'],
  父母: ['適合簽約、考試、進修、處理房屋。', '文件照流程辦理即可。', '契約文書多看細節，多關心長輩。'],
  子孫: ['適合休假、創作、處理子女事務，心情較輕鬆。', '記得安排休息。', '防玩樂破財，子女事務較操心。'],
  兄弟: ['適合團隊合作、拓展人脈。', '人際照常往來即可。', '防競爭、口舌與不必要的開銷。'],
};

/** 卦（上卦或下卦）五行與月／年五行的關係 → 分數與白話 */
function trigramVs(trigramWx, wx, side) {
  const who = side === 'outer' ? '外在環境、人際與事業' : '內在心境與身體';
  if (wx === trigramWx) return { score: 0.5, text: `${who}比和得助，氣勢較旺` };
  if (GEN[wx] === trigramWx) return { score: 1, text: `${who}得生，順風順水` };
  if (GEN[trigramWx] === wx) return { score: -0.5, text: `${who}付出多、較耗神` };
  if (KE[trigramWx] === wx) return { score: 0, text: `${who}能掌控局面，但要花力氣` };
  return { score: -1, text: `${who}受制，阻力較多` }; // KE[wx] === trigramWx
}

/**
 * 世爻（自己）對某地支（太歲或月建）的狀態
 * @param {'歲'|'月'} kind
 */
function shiVs(shi, branch, kind) {
  const ws = getWuxingWangShuai(shi.wuxing, branch);
  // 旺 3、相 2、休 −1、囚 −2、死 −3 → 縮成 ±2 範圍
  let score = { 旺: 2, 相: 1.5, 休: -0.5, 囚: -1, 死: -2 }[ws.status] ?? 0;
  const notes = [`世爻${shi.branch}${shi.wuxing}逢${kind === '歲' ? '太歲' : '月建'}${branch}${BRANCH_WUXING[branch]}為「${ws.status}」（${ws.desc}）`];
  if (shi.branch === branch) { score += 1; notes.push(`世爻臨${kind === '歲' ? '太歲' : '月建'}：當權得勢，自己作得了主`); }
  if (CLASH[branch] === shi.branch) { score -= 2; notes.push(kind === '歲' ? '太歲沖世爻（歲破）：整年根基易動搖，宜守成' : '月建沖世爻（月破）：本月易破耗、計畫生變，凡事多確認'); }
  if (HE6[branch] === shi.branch) { score += 1; notes.push(`${kind === '歲' ? '太歲' : '月建'}合世爻：有人牽成、容易得助，但也可能被人情綁住`); }
  if (isXing(branch, shi.branch) && shi.branch !== branch) { score -= 1; notes.push(`${kind === '歲' ? '太歲' : '月建'}刑世爻：易有摩擦、是非，說話做事留餘地`); }
  if (shi.branch === branch && SELF_XING.includes(branch)) { score -= 0.5; notes.push('世爻自刑：容易自己給自己壓力'); }
  return { status: ws.status, score, notes };
}

/** 年干支（立春換年） */
export function yearGanZhi(y) {
  const idx = (((y - 4) % 60) + 60) % 60;
  return { stem: STEMS[idx % 10], branch: BRANCHES[idx % 12] };
}

/** 某八字年的十二個節氣月：寅月（立春）到丑月（小寒），含月干（五虎遁）與起訖時刻 */
export function solarMonthsOf(y) {
  const { stem } = yearGanZhi(y);
  // 五虎遁：甲己丙寅、乙庚戊寅、丙辛庚寅、丁壬壬寅、戊癸甲寅
  const firstStem = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 }[stem];
  const starts = [];
  for (let k = 0; k <= 12; k += 1) {
    const lon = (315 + 30 * k) % 360;
    // 立春約 2/4，之後每月約 30.44 天
    const guess = new Date(Date.UTC(y, 1, 4) + k * 30.44 * 86400000);
    starts.push(findSunLongitudeTime(lon, guess));
  }
  return Array.from({ length: 12 }, (_, k) => ({
    idx: k,
    lunarName: LUNAR_MONTH[k],
    stem: STEMS[(firstStem + k) % 10],
    branch: BRANCHES[(2 + k) % 12],
    from: starts[k],
    to: starts[k + 1],
  }));
}

/** 預設要看的年份：立春前約 100 天內（過年前後）就看即將到來的那一年 */
export function defaultLiunianYear(now = new Date()) {
  return baziYearOf(new Date(now.getTime() + 100 * 86400000));
}

/**
 * @param {Object} p
 * @param {Array} p.lines     buildWeixinChart(...).lines（六爻，含 isShi / isYing）
 * @param {Object} p.palace   buildWeixinChart(...).palace（palaceWuxing）
 * @param {number} p.upId     上卦（TRIGRAMS key）
 * @param {number} p.loId     下卦
 * @param {number} p.year     要看的流年（八字年，以立春換年）
 * @param {string} p.gender
 * @param {string} p.birthBranch 生肖地支（農曆生年）
 */
export function buildWeixinLiunian({ lines, palace, upId, loId, year, gender = '男', birthBranch }) {
  const shi = lines.find((l) => l.isShi);
  const ying = lines.find((l) => l.isYing);
  const outerWx = TRIGRAMS[upId].wuxing;
  const innerWx = TRIGRAMS[loId].wuxing;
  const pw = palace.palaceWuxing;
  const { stem: ys, branch: yb } = yearGanZhi(year);
  const ybWx = BRANCH_WUXING[yb];

  // ── 全年：太歲 vs 命卦 ──
  const ySelf = shiVs(shi, yb, '歲');
  const yOuter = trigramVs(outerWx, ybWx, 'outer');
  const yInner = trigramVs(innerWx, ybWx, 'inner');
  const yearNotes = [...ySelf.notes, `上卦${TRIGRAMS[upId].name}（${outerWx}）：${yOuter.text}`, `下卦${TRIGRAMS[loId].name}（${innerWx}）：${yInner.text}`];
  // 生肖犯太歲（民俗，只作提醒，計分較輕）
  const taisui = [];
  if (birthBranch) {
    const z = `屬${ZODIAC[birthBranch]}`;
    if (birthBranch === yb) taisui.push(`${z}值太歲（本命年）`);
    if (CLASH[birthBranch] === yb) taisui.push(`${z}沖太歲`);
    if (isXing(birthBranch, yb) && birthBranch !== yb) taisui.push(`${z}刑太歲`);
    if (HAI[birthBranch] === yb) taisui.push(`${z}害太歲`);
    if (PO[birthBranch] === yb) taisui.push(`${z}破太歲`);
  }
  const taisuiScore = taisui.some((t) => t.includes('沖')) ? -1 : taisui.length ? -0.5 : 0;
  const yearScore = Math.round((ySelf.score + yOuter.score + yInner.score + taisuiScore) * 10) / 10;
  const yearStemRel = getRelation(pw, { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }[ys]);
  const yearBranchRel = getRelation(pw, ybWx);

  // ── 每個月：月建 vs 命卦 ──
  const yearAdj = yearScore >= 2 ? 0.5 : yearScore <= -2 ? -0.5 : 0; // 太歲為一年的大背景，輕微加權
  const months = solarMonthsOf(year).map((m) => {
    const wx = BRANCH_WUXING[m.branch];
    const self = shiVs(shi, m.branch, '月');
    const outer = trigramVs(outerWx, wx, 'outer');
    const inner = trigramVs(innerWx, wx, 'inner');
    const rel = getRelation(pw, wx);
    const notes = [...self.notes];
    if (ying && CLASH[m.branch] === ying.branch) notes.push(`月建沖應爻${ying.branch}：對方、合作關係或外部環境有變動`);
    if (ying && HE6[m.branch] === ying.branch) notes.push(`月建合應爻${ying.branch}：外部助力或合作機會增加`);
    const score = Math.round((self.score + outer.score + inner.score + yearAdj) * 10) / 10;
    const level = levelOf(score);
    const theme = themeOf(rel, gender);
    const tier = level === '吉' || level === '小吉' ? 0 : level === '平' ? 1 : 2;
    const advice = ADVICE[rel][tier];
    return {
      ...m, wx, gz: `${m.stem}${m.branch}`,
      shiStatus: self.status, outer, inner, relation: rel, theme,
      score, level, notes, advice,
    };
  });

  const best = [...months].sort((a, b) => b.score - a.score).slice(0, 2);
  const worst = [...months].sort((a, b) => a.score - b.score).slice(0, 2);

  return {
    year, gz: `${ys}${yb}`, zodiac: ZODIAC[yb],
    shi: { branch: shi.branch, wuxing: shi.wuxing, relation: shi.relation, lineNum: shi.lineNum },
    yearScore, yearLevel: levelOf(yearScore), yearNotes,
    yearTheme: { stem: `${ys}（${yearStemRel}）：上半年重心在${themeOf(yearStemRel, gender).split('；')[0]}`, branch: `${yb}（${yearBranchRel}）：下半年重心在${themeOf(yearBranchRel, gender).split('；')[0]}` },
    taisui,
    months,
    best: best.map((m) => m.lunarName), worst: worst.map((m) => m.lunarName),
    notes: [
      '本功能為本站整合法：以命卦六爻（世爻、上下卦）對照流年太歲與每月月建的五行生剋、沖合刑，並非唯心宗官方的流年算法；請當作參考。',
      '月份以節氣分（立春起寅月＝正月），與農曆初一換月約有半個月的差距；表中日期為台灣時間。',
    ],
  };
}

// ───────── 立春卜流年卦（唯心宗作法：立春後另起一卦，看太歲與世爻） ─────────

const MU = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }; // 五行入墓之地支（水土同墓於辰）
const TAISUI_TONE = {
  妻財: { score: 1.5, text: '太歲為妻財：一年財源與實質收穫較多，基調偏吉' },
  子孫: { score: 1.5, text: '太歲為子孫：福神當值，可解憂、平安順心，基調偏吉' },
  官鬼: { score: -1.5, text: '太歲為官鬼：壓力、是非或憂慮較多，宜謹慎修持' },
  父母: { score: 0, text: '太歲為父母：文書、長輩、房屋與學習的事務多，辛勞但有庇蔭' },
  兄弟: { score: 0, text: '太歲為兄弟：人際、競爭與開銷較多，錢財宜守' },
};

/** 某爻（世爻或用神）對某地支（太歲或月建）：生剋、沖合、臨、入墓 */
function lineVs(line, branch, label) {
  const wx = BRANCH_WUXING[branch];
  let score = 0; const notes = [];
  if (line.branch === branch) { score += 1; notes.push(`臨${label}：得勢有力`); }
  else if (GEN[wx] === line.wuxing) { score += 1.5; notes.push(`${label}${branch}${wx}生${line.branch}${line.wuxing}：得助`); }
  else if (wx === line.wuxing) { score += 1; notes.push(`${label}${branch}與${line.branch}比和：得扶`); }
  else if (KE[wx] === line.wuxing) { score -= 1.5; notes.push(`${label}${branch}${wx}剋${line.branch}${line.wuxing}：受制`); }
  if (CLASH[branch] === line.branch) { score -= 3; notes.push(`${label}沖${line.branch}：不順、易有變動（唯心宗：世爻沖太歲，一年不順）`); }
  if (HE6[branch] === line.branch) { score += 1; notes.push(`${label}合${line.branch}：有牽成與助力`); }
  if (MU[line.wuxing] === branch && line.branch !== branch) { score -= 1.5; notes.push(`${line.wuxing}入${label}${branch}墓：易困頓、受拘，施展不開`); }
  return { score, notes };
}

/**
 * @param {Object} p
 * @param {number} p.num1 上卦數 @param {number} p.num2 下卦數 @param {number} p.num3 動爻數
 * @param {Date}   p.castAt 起卦時刻
 * @param {number} p.year   所卜流年（八字年）
 * @param {string} p.topic  '整體' 或一事一占的主題（財運、事業、感情、健康…）
 */
export function castLiunianGua({ num1, num2, num3, castAt, year, topic = '整體', gender = '男' }) {
  const t = new Date(castAt.getTime() + 8 * 3600000); // 以台灣時間定日期與時辰
  const c = chineseClock(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours());
  const pillars = calculatePillars(c.year, c.month, c.day, c.hourIdx, { utc: castAt, hourStemDayShift: c.hourStemDayShift });
  const board = buildDivinationBoard({ num1, num2, num3, pillars });
  const { linesData, palaceInfo } = board;
  const { branch: yb, stem: ys } = yearGanZhi(year);
  const shi = linesData.find((l) => l.isShi);

  const warnings = [];
  const liChun = solarMonthsOf(year)[0].from;
  const lc8 = new Date(liChun.getTime() + 8 * 3600000);
  if (castAt.getTime() < liChun.getTime()) warnings.push(`尚未立春（${year} 年立春為 ${lc8.getUTCMonth() + 1}/${lc8.getUTCDate()}）：唯心宗的作法是立春之後才卜流年卦，此卦僅供參考。`);
  if (castAt.getTime() >= solarMonthsOf(year)[11].to.getTime()) warnings.push(`起卦時間已過 ${year} 年（下一個立春之後），請確認所卜年份。`);

  // 一事一占引擎：有指定主題時，以該主題的用神論吉凶
  const evaluation = topic !== '整體' ? evaluateDivination({
    topic, pillars, linesData, movingLine: board.moving, palaceWuxing: palaceInfo.palaceWuxing,
    originalHex: board.originalHex, changedHex: board.changedHex, nuclearHex: board.nuclearHex, gender, palaceId: palaceInfo.palaceId,
  }) : null;
  const ys0 = evaluation?.yongShen;
  const target = ys0 && !ys0.isFu && !ys0.isSubstitute
    ? linesData.find((l) => l.lineNum === ys0.lineNum)
    : ys0?.isFu ? { branch: ys0.branch, wuxing: ys0.wuxing, lineNum: ys0.lineNum, isFu: true } : shi;
  const targetName = topic === '整體' || ys0?.isSubstitute ? '世爻' : `用神${ys0.name}${ys0.isFu ? '（伏）' : ''}`;

  // 太歲
  const taisuiRel = getRelation(palaceInfo.palaceWuxing, BRANCH_WUXING[yb]);
  const tone = TAISUI_TONE[taisuiRel];
  const taisuiLines = linesData.filter((l) => l.branch === yb).map((l) => l.lineNum);
  const shiVsYear = lineVs(shi, yb, '太歲');
  const tgtVsYear = target === shi ? null : lineVs(target, yb, '太歲');
  const yearNotes = [tone.text, ...shiVsYear.notes.map((n) => `世爻：${n}`)];
  if (tgtVsYear) yearNotes.push(...tgtVsYear.notes.map((n) => `${targetName}：${n}`));
  if (taisuiLines.length) yearNotes.push(`第 ${taisuiLines.join('、')} 爻臨太歲（${yb}）：該爻所代表的六親是今年的重點`);
  if (board.moving) {
    const mv = linesData.find((l) => l.isMoving);
    yearNotes.push(`${mv.lineNum}爻（${mv.relation}）發動 → 變卦${board.changedHex.name}：${mv.relation}相關的事今年會有變化`);
  }
  // 特殊卦象：有主題時已含在引擎分數；整體流年另以世爻為對象偵測（六合主聚、六沖主變動，不分吉凶）
  const patterns = evaluation ? evaluation.patterns : detectSpecialPatterns({ linesData, pillars, topic: '', ys: shi });
  const patternScore = evaluation ? 0 : Math.max(-2, Math.min(2, patterns.reduce((s, p) => s + p.score, 0)));
  const yearScore = Math.round((tone.score + shiVsYear.score + (tgtVsYear ? tgtVsYear.score : 0) + patternScore + (evaluation ? Math.max(-2, Math.min(2, evaluation.score / 3)) : 0)) * 10) / 10;

  // 逐月：以論斷對象（世爻或用神）對照月建
  const months = solarMonthsOf(year).map((m) => {
    const ws = getWuxingWangShuai(target.wuxing, m.branch);
    let score = { 旺: 2, 相: 1.5, 休: -0.5, 囚: -1, 死: -2 }[ws.status] ?? 0;
    const notes = [`${targetName}${target.branch}${target.wuxing}逢月建${m.branch}為「${ws.status}」`];
    if (target.branch === m.branch) { score += 1; notes.push('臨月建：當月得力，事情易成'); }
    if (CLASH[m.branch] === target.branch) { score -= 2; notes.push('月破：當月不宜推進重要的事'); }
    if (HE6[m.branch] === target.branch) { score += 1; notes.push('月建相合：有助力'); }
    if (MU[target.wuxing] === m.branch && target.branch !== m.branch) { score -= 1; notes.push(`入月墓（${m.branch}）：當月易受困`); }
    if (target.isKongWang && (m.branch === target.branch || CLASH[m.branch] === target.branch)) notes.push('旬空逢填實／沖空：此月為應事之期');
    score = Math.round(score * 10) / 10;
    return { ...m, gz: `${m.stem}${m.branch}`, status: ws.status, score, level: levelOf(score), notes };
  });

  return {
    year, gz: `${ys}${yb}`, topic, targetName,
    pillars, board, linesData, palaceInfo, evaluation,
    taisui: { branch: yb, relation: taisuiRel, lines: taisuiLines },
    yearScore, yearLevel: levelOf(yearScore), yearNotes, months, warnings, patterns,
  };
}

/** 純文字摘要（方便複製給同事） */
export function weixinLiunianText(name, hexName, r) {
  const fmt = (d) => { const t = new Date(d.getTime() + 8 * 3600000); return `${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };
  return [
    `【${name}・${r.year} ${r.gz}年（${r.zodiac}年）流年】命卦：${hexName}`,
    `全年：${r.yearLevel}。${r.yearTheme.stem}；${r.yearTheme.branch}`,
    r.taisui.length ? `太歲提醒：${r.taisui.join('、')}` : '',
    `較順月份：${r.best.join('、')}；宜謹慎月份：${r.worst.join('、')}`,
    ...r.months.map((m) => `${m.lunarName}（${m.gz}，${fmt(m.from)}起）${m.level}｜${m.advice}`),
    '※ 本站整合法，僅供參考。',
  ].filter(Boolean).join('\n');
}
