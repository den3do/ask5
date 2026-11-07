import { solarToLunar } from './lunar.js';
import { chineseClock } from './chineseTime.js';

// 唯心宗（edunet 鬼谷子心法命卦）取卦規則，由實測樣本反推（尚待更多樣本驗證）：
//   上卦 = 農曆日 % 8（餘 0 = 坤）
//   下卦 = 農曆月 % 8（餘 0 = 坤）
//   動爻 = 時支數（子1…亥12）% 6（餘 0 = 6）；無時辰則無動爻
// 回傳的卦序號沿用 TRIGRAMS 的 key（乾1 兌2 離3 震4 巽5 坎6 艮7 坤0）。
export function weixinMingGua({ calendarType, year, month, day, hour, moment }) {
  let lm = Number(month);
  let ld = Number(day);
  let hourIdx = null;
  if (moment) {
    // 與全站一致：真太陽時、夜子時換日後的有效日期與時辰
    const c = moment.chinese;
    const l = solarToLunar(c.year, c.month, c.day);
    lm = l.lunarMonth;
    ld = l.lunarDay;
    hourIdx = c.hourIdx;
  } else {
    const h = hour === '' || hour == null ? null : Number(hour);
    const hasH = h !== null && !Number.isNaN(h);
    if (calendarType !== 'lunar') {
      const c = hasH ? chineseClock(Number(year), Number(month), Number(day), h) : null;
      const l = solarToLunar(c ? c.year : Number(year), c ? c.month : Number(month), c ? c.day : Number(day));
      lm = l.lunarMonth;
      ld = l.lunarDay;
      hourIdx = c ? c.hourIdx : null;
    } else if (hasH) {
      hourIdx = chineseClock(Number(year), Number(month), Number(day), h).hourIdx;
    }
  }
  let movingLine = null;
  if (hourIdx !== null) {
    movingLine = (hourIdx + 1) % 6 || 6; // 子=1 … 亥=12
  }
  // experimental：規則由少數樣本反推、未經官方確認；動爻公式亦與梅花命卦（總和 %6）不同，
  // 兩者是不同流派的獨立規則，不可互相印證。
  return { upperId: ld % 8, lowerId: lm % 8, movingLine, lunarMonth: lm, lunarDay: ld, experimental: true };
}

// 動爻（1=初爻…6=上爻）變動後的上下卦（TRIGRAMS key）
export function changedTrigrams(upperId, lowerId, movingLine, TRIGRAMS) {
  if (!movingLine) return null;
  const flip = (bin, idx) => bin.split('').map((b, i) => (i === idx ? (b === '1' ? '0' : '1') : b)).join('');
  let up = TRIGRAMS[upperId].binary;
  let lo = TRIGRAMS[lowerId].binary;
  if (movingLine <= 3) lo = flip(lo, 3 - movingLine); // binary 由上而下
  else up = flip(up, 6 - movingLine);
  const idOf = (bin) => Number(Object.keys(TRIGRAMS).find((k) => TRIGRAMS[k].binary === bin));
  return { upperId: idOf(up), lowerId: idOf(lo) };
}

// ───────── 六爻納甲排盤（與「占卜」頁同一套邏輯，供唯心宗命卦顯示）─────────
import { TRIGRAMS, BRANCH_WUXING, WUXING_RELATION, NAJIA_TABLE } from '../data/constants.js';
import { getRelation, getSixBeasts, findPalaceAndShi, checkBranchInteraction } from './iching.js';
import { calculatePillars } from './lunar.js';

export function buildWeixinChart(birth, upId, loId, movingLine) {
  const c = birth.moment?.chinese || chineseClock(birth.year, birth.month, birth.day, birth.hour);
  const pillars = calculatePillars(c.year, c.month, c.day, c.hourIdx, { utc: birth.moment?.utc });
  const palace = findPalaceAndShi(upId, loId);
  const beasts = getSixBeasts(pillars.dayStem);
  const ch = changedTrigrams(upId, loId, movingLine, TRIGRAMS);
  const bitsOf = (id) => TRIGRAMS[id].binary.split('').map(Number);
  const lb = bitsOf(loId);
  const ub = bitsOf(upId);
  const bits = [lb[2], lb[1], lb[0], ub[2], ub[1], ub[0]]; // 初爻→上爻
  const branches = [...NAJIA_TABLE[loId].inner, ...NAJIA_TABLE[upId].outer];
  const newBranches = ch ? [...NAJIA_TABLE[ch.lowerId].inner, ...NAJIA_TABLE[ch.upperId].outer] : null;

  const lines = bits.map((bit, i) => {
    const lineNum = i + 1;
    const branch = branches[i];
    const wuxing = BRANCH_WUXING[branch];
    const isMoving = movingLine === lineNum;
    let changed = null;
    if (isMoving) {
      const cBranch = newBranches[i];
      const cWuxing = BRANCH_WUXING[cBranch];
      changed = {
        branch: cBranch,
        wuxing: cWuxing,
        relation: getRelation(palace.palaceWuxing, cWuxing),
        interact: WUXING_RELATION[cWuxing][wuxing],
        specialInteract: checkBranchInteraction(branch, cBranch),
      };
    }
    return {
      lineNum, bit, branch, wuxing,
      relation: getRelation(palace.palaceWuxing, wuxing),
      beast: beasts[i],
      isShi: palace.shi === lineNum,
      isYing: palace.ying === lineNum,
      isMoving,
      isKongWang: pillars.kongWang.includes(branch),
      isYuePo: branch === pillars.yuePoBranch,
      changed,
    };
  });
  return { lines, pillars, palace };
}
