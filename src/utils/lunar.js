/**
 * 萬年曆與農曆轉換模組 (支援 1900 ~ 2100 年)
 * 包含：公曆/農曆雙向換算、節氣計算、四柱干支、梅花/終身命卦起數
 */

// 1900-2100 年農曆資料表 (每年的農曆大小月與閏月資訊)
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06aa0,0x1a6c4,0x0aae0,
  0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520
];

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 傳回農曆 y 年的總天數
function lYearDays(y) {
  let i, sum = 348;
  for (i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(y);
}

// 傳回農曆 y 年閏月的天數
function leapDays(y) {
  if (leapMonth(y)) {
    return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}

// 傳回農曆 y 年閏哪個月 1-12，沒閏傳回 0
function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf;
}

// 傳回農曆 y 年 m 月的總天數
function monthDays(y, m) {
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}

/**
 * 國曆 (陽曆) 轉 農曆 (陰曆)
 */
export function solarToLunar(year, month, day) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  // 1900-01-31 是農曆 1900 年正月初一
  const baseDate = new Date(1900, 0, 31);
  const objDate = new Date(y, m - 1, d);
  let offset = Math.round((objDate - baseDate) / 86400000);

  let lunarYear = 1900;
  for (let i = 1900; i < 2101; i++) {
    const temp = lYearDays(i);
    if (offset < temp) {
      lunarYear = i;
      break;
    }
    offset -= temp;
  }

  const leap = leapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth = 1;

  for (let i = 1; i < 13; i++) {
    let temp = 0;
    if (leap > 0 && i === (leap + 1) && !isLeap) {
      --i;
      isLeap = true;
      temp = leapDays(lunarYear);
    } else {
      temp = monthDays(lunarYear, i);
    }

    if (offset < temp) {
      lunarMonth = i;
      break;
    }
    offset -= temp;
    if (isLeap && i === (leap + 1)) {
      isLeap = false;
    }
  }

  const lunarDay = offset + 1;

  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap
  };
}

/**
 * 農曆轉公曆 (簡化安全版)
 */
export function lunarToSolar(lYear, lMonth, lDay, isLeap = false) {
  let offset = 0;
  for (let i = 1900; i < lYear; i++) {
    offset += lYearDays(i);
  }

  const leap = leapMonth(lYear);
  for (let i = 1; i < lMonth; i++) {
    offset += monthDays(lYear, i);
    if (leap > 0 && i === leap) {
      offset += leapDays(lYear);
    }
  }

  if (isLeap && leap === lMonth) {
    offset += monthDays(lYear, lMonth);
  }

  offset += (lDay - 1);

  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(baseDate.getTime() + offset * 86400000);

  return {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth() + 1,
    day: targetDate.getDate()
  };
}

/**
 * 計算四柱干支（立春換歲、節氣換月、基準日換日）
 */
export function calculatePillars(solarYear, solarMonth, solarDay, hourBranchIdx = null) {
  const y = parseInt(solarYear, 10);
  const m = parseInt(solarMonth, 10) - 1; // 0-11
  const d = parseInt(solarDay, 10);

  // 1. 年柱：以立春（約 2 月 4 日）交節換年
  const isBeforeLiChun = (m === 0) || (m === 1 && d < 4);
  const calcYear = isBeforeLiChun ? y - 1 : y;
  let yOffset = (calcYear - 1984) % 60;
  if (yOffset < 0) yOffset += 60;
  const yStem = STEMS[yOffset % 10];
  const yBranch = BRANCHES[yOffset % 12];

  // 2. 日柱：以 2000 年 1 月 1 日（戊午日）為基準算天數差
  const targetUtc = Date.UTC(y, m, d);
  const refUtc = Date.UTC(2000, 0, 1);
  const dayDiff = Math.round((targetUtc - refUtc) / (1000 * 60 * 60 * 24));
  let dStemIdx = (4 + dayDiff) % 10;
  let dBranchIdx = (6 + dayDiff) % 12;
  if (dStemIdx < 0) dStemIdx += 10;
  if (dBranchIdx < 0) dBranchIdx += 12;
  const dStem = STEMS[dStemIdx];
  const dBranch = BRANCHES[dBranchIdx];

  // 3. 月柱（月建與五虎遁）
  // 節氣大致日子：1/6小寒, 2/4立春, 3/6驚蟄, 4/5清明, 5/6立夏, 6/6芒種, 7/7小暑, 8/8立秋, 9/8白露, 10/8寒露, 11/7立冬, 12/7大雪
  const getJieMonthIndex = (monthVal, dayVal) => {
    const jieDays = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7];
    const passed = dayVal >= jieDays[monthVal];
    switch (monthVal) {
      case 0: return passed ? 11 : 10; // 丑(11) : 子(10)
      case 1: return passed ? 0 : 11;  // 寅(0) : 丑(11)
      case 2: return passed ? 1 : 0;   // 卯(1) : 寅(0)
      case 3: return passed ? 2 : 1;   // 辰(2) : 卯(1)
      case 4: return passed ? 3 : 2;   // 巳(3) : 辰(2)
      case 5: return passed ? 4 : 3;   // 午(4) : 巳(3)
      case 6: return passed ? 5 : 4;   // 未(5) : 午(4)
      case 7: return passed ? 6 : 5;   // 申(6) : 未(5)
      case 8: return passed ? 7 : 6;   // 酉(7) : 申(6)
      case 9: return passed ? 8 : 7;   // 戌(8) : 酉(7)
      case 10: return passed ? 9 : 8;  // 亥(9) : 戌(8)
      case 11: return passed ? 10 : 9; // 子(10) : 亥(9)
      default: return 0;
    }
  };

  const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const jieMonth = getJieMonthIndex(m, d);
  const mBranch = monthBranches[jieMonth];

  // 五虎遁月干：甲己之年丙作首，乙庚戊為頭，丙辛尋庚起，丁壬壬位流，戊癸甲何求
  const yStemIdx = STEMS.indexOf(yStem);
  const monthStemStart = ((yStemIdx % 5) * 2 + 2) % 10;
  const mStem = STEMS[(monthStemStart + jieMonth) % 10];

  // 4. 時柱
  let hStem = '';
  let hBranch = '';
  if (hourBranchIdx !== null && hourBranchIdx >= 0 && hourBranchIdx < 12) {
    hBranch = BRANCHES[hourBranchIdx];
    // 五鼠遁日
    const dayIdx = STEMS.indexOf(dStem);
    const startStemIdx = ((dayIdx % 5) * 2) % 10;
    hStem = STEMS[(startStemIdx + hourBranchIdx) % 10];
  }

  // 旬空計算
  const sIdx = STEMS.indexOf(dStem);
  const bIdx = BRANCHES.indexOf(dBranch);
  const xunShouBranchIdx = (bIdx - sIdx + 12) % 12;
  const kw1 = BRANCHES[(xunShouBranchIdx + 10) % 12];
  const kw2 = BRANCHES[(xunShouBranchIdx + 11) % 12];

  // 月破：與月建地支相沖者
  const clashPairs = {
    '子': '午', '午': '子', '丑': '未', '未': '丑',
    '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳'
  };
  const yuePoBranch = clashPairs[mBranch];
  const riPoBranch = clashPairs[dBranch];

  return {
    year: `${yStem}${yBranch}`,
    month: `${mStem}${mBranch}`,
    day: `${dStem}${dBranch}`,
    hour: hStem && hBranch ? `${hStem}${hBranch}` : '未明',
    yearBranch: yBranch,
    monthBranch: mBranch,
    dayStem: dStem,
    dayBranch: dBranch,
    hourBranch: hBranch || null,
    kongWang: [kw1, kw2],
    yuePoBranch,
    riPoBranch
  };
}

/**
 * 依農曆生辰計算終身卦數字（邵康節梅花命卦法）
 * 若無時辰：以天地人三才定上卦與下卦
 */
export function calculateDestinyHexNumbers(lunarYear, lunarMonth, lunarDay, hourBranchIdx = null) {
  // 年支數：子=1, 丑=2, ... 亥=12
  const yOffset = (lunarYear - 4) % 12; // 2024 甲辰年 辰=5
  const yearBranchNum = yOffset >= 0 ? yOffset + 1 : yOffset + 13;
  const monthNum = parseInt(lunarMonth, 10);
  const dayNum = parseInt(lunarDay, 10);

  // 上卦：年支數 + 農曆月 + 農曆日
  const upperSum = yearBranchNum + monthNum + dayNum;
  let upper = upperSum % 8;
  if (upper === 0) upper = 8;

  let lower = 1;
  let moving = 1;

  if (hourBranchIdx !== null && hourBranchIdx >= 0) {
    const hourNum = hourBranchIdx + 1; // 子=1 ... 亥=12
    const totalSum = upperSum + hourNum;
    lower = totalSum % 8;
    if (lower === 0) lower = 8;
    moving = totalSum % 6;
    if (moving === 0) moving = 6;
  } else {
    // 無時辰起卦（傳統以月日為人地之道）：
    // 下卦 = (月 + 日) % 8
    const lowerSum = monthNum + dayNum;
    lower = lowerSum % 8;
    if (lower === 0) lower = 8;
    // 動爻 = 總和 % 6
    moving = upperSum % 6;
    if (moving === 0) moving = 6;
  }

  // 映射到系統內部 TRIGRAM key (1~7, 0代表坤8)
  const toTrigramKey = (num) => num === 8 ? 0 : num;

  return {
    num1: upperSum,
    num2: hourBranchIdx !== null ? (upperSum + hourBranchIdx + 1) : (monthNum + dayNum),
    num3: hourBranchIdx !== null ? (upperSum + hourBranchIdx + 1) : upperSum,
    upperTrigramId: toTrigramKey(upper),
    lowerTrigramId: toTrigramKey(lower),
    movingLine: moving,
    hasHour: hourBranchIdx !== null
  };
}
