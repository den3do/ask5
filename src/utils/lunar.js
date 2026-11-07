/**
 * 萬年曆與農曆轉換模組 (支援 1900 ~ 2100 年)
 * 包含：公曆/農曆雙向換算、節氣計算、四柱干支、梅花/終身命卦起數
 *
 * 曆法來源（單一來源，避免各系統日期不一致）：
 *   LUNAR_INFO 以天文推算（astronomy-engine 新月＋中氣定閏）交叉比對
 *   舊版萬年曆表與 ICU 中國曆後校正；已修正 1933、1954、1956、1978、1996、2057 年月大小。
 *   （瀏覽器內建 ICU 在 1917、1922、1987、2012 等年份的閏月與月大小有誤，故不再使用。）
 * 四柱的年柱、月柱以「太陽黃經真實交節時刻」換算，不再使用固定日期。
 */
import { bodyLongitude, findSunLongitudeTime, localToUtcDate, norm360 } from './ephemeris.js';

// 1900-2100 年農曆資料表 (每年的農曆大小月與閏月資訊)
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520
];

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const DAY_MS = 86400000;
const LUNAR_BASE_UTC = Date.UTC(1900, 0, 31); // 1900-01-31 是農曆 1900 年正月初一

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

  let offset = Math.round((Date.UTC(y, m - 1, d) - LUNAR_BASE_UTC) / DAY_MS);
  if (!Number.isFinite(offset) || offset < 0) throw new RangeError('日期超出支援範圍（1900-01-31 之後）');

  let lunarYear = 0;
  for (let i = 1900; i < 2101; i++) {
    const temp = lYearDays(i);
    if (offset < temp) {
      lunarYear = i;
      break;
    }
    offset -= temp;
  }
  if (!lunarYear) throw new RangeError('日期超出支援範圍（2100 年底之前）');

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

  return { lunarYear, lunarMonth, lunarDay: offset + 1, isLeap };
}

/**
 * 農曆轉公曆
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

  const target = new Date(LUNAR_BASE_UTC + offset * DAY_MS);
  return {
    year: target.getUTCFullYear(),
    month: target.getUTCMonth() + 1,
    day: target.getUTCDate(),
  };
}

/** 農曆 y 年閏幾月（0 = 無閏），供表單提示用 */
export function getLeapMonth(y) {
  return leapMonth(y);
}

const MONTH_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const JIE_NAMES = ['立春', '驚蟄', '清明', '立夏', '芒種', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

/** 立春（太陽黃經 315°）交節時刻（UTC Date） */
export function liChunInstant(year) {
  return findSunLongitudeTime(315, new Date(Date.UTC(year, 1, 4, 12)));
}

/** 某絕對時刻所屬的「八字年」（以立春真實時刻換年，流年／年柱用） */
export function baziYearOf(date = new Date()) {
  const y = date.getUTCFullYear();
  return date.getTime() < liChunInstant(y).getTime() ? y - 1 : y;
}

/** 某時刻所屬的「農曆年」（以正月初一換年，紫微流年／虛歲用；以 UTC+8 的日期判斷） */
export function lunarYearOf(date = new Date()) {
  const d = new Date(date.getTime() + 8 * 3600000);
  return solarToLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).lunarYear;
}

/**
 * 計算四柱干支
 *  - 年柱：以太陽到達黃經 315°（立春）的真實時刻換年
 *  - 月柱：以太陽黃經每 30° 的「節」真實時刻換月，月干用五虎遁
 *  - 日柱：以（已套用夜子時換日的）日期計算
 *  - 時柱：五鼠遁
 * @param {number} solarYear,solarMonth,solarDay  有效日期（若 23:00 後已換日，請傳入換日後的日期）
 * @param {number|null} hourBranchIdx             時辰 0(子)~11(亥)
 * @param {Object} [opts]
 * @param {Date}   [opts.utc]  出生（或占卜）的絕對時刻；省略時以該日該時辰中心、UTC+8 估算
 */
export function calculatePillars(solarYear, solarMonth, solarDay, hourBranchIdx = null, opts = {}) {
  const y = parseInt(solarYear, 10);
  const m = parseInt(solarMonth, 10);
  const d = parseInt(solarDay, 10);

  const hasHour = hourBranchIdx !== null && hourBranchIdx !== undefined && hourBranchIdx >= 0 && hourBranchIdx < 12;
  const utc = opts.utc instanceof Date && !Number.isNaN(opts.utc.getTime())
    ? opts.utc
    : localToUtcDate({ year: y, month: m, day: d, hour: hasHour ? hourBranchIdx * 2 : 12, minute: 0, tz: 8 });

  // 1. 年柱：真實立春時刻
  const calcYear = utc.getTime() < liChunInstant(y).getTime() ? y - 1 : y;
  let yOffset = (calcYear - 1984) % 60;
  if (yOffset < 0) yOffset += 60;
  const yStem = STEMS[yOffset % 10];
  const yBranch = BRANCHES[yOffset % 12];

  // 2. 日柱：以 2000 年 1 月 1 日（戊午日）為基準算天數差
  const dayDiff = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / DAY_MS);
  let dStemIdx = (4 + dayDiff) % 10;
  let dBranchIdx = (6 + dayDiff) % 12;
  if (dStemIdx < 0) dStemIdx += 10;
  if (dBranchIdx < 0) dBranchIdx += 12;
  const dStem = STEMS[dStemIdx];
  const dBranch = BRANCHES[dBranchIdx];

  // 3. 月柱：太陽黃經 315° 起每 30° 為一個節月（寅月起）
  const sunLon = bodyLongitude('sun', utc);
  const sinceLiChun = norm360(sunLon - 315);
  const jieMonth = Math.floor(sinceLiChun / 30); // 0=寅 … 11=丑
  const mBranch = MONTH_BRANCHES[jieMonth];

  // 距離最近交節的時數（太陽約每日 0.9856°），過近時提示出生時間需精確
  const degToNext = 30 - (sinceLiChun % 30);
  const degFromPrev = sinceLiChun % 30;
  const nearestDeg = Math.min(degToNext, degFromPrev);
  const hoursToJie = (nearestDeg / 0.9856) * 24;
  const nearJie = hoursToJie < 12;
  const nearJieName = degFromPrev <= degToNext ? JIE_NAMES[jieMonth] : JIE_NAMES[(jieMonth + 1) % 12];
  const termWarning = nearJie
    ? `出生時刻距「${nearJieName}」交節僅約 ${Math.max(1, Math.round(hoursToJie))} 小時，月柱（及立春前後的年柱）對出生時間與時區極敏感，請務必確認時間。`
    : null;

  // 五虎遁月干：甲己之年丙作首，乙庚戊為頭，丙辛尋庚起，丁壬壬位流，戊癸甲何求
  const yStemIdx = STEMS.indexOf(yStem);
  const monthStemStart = ((yStemIdx % 5) * 2 + 2) % 10;
  const mStem = STEMS[(monthStemStart + jieMonth) % 10];

  // 4. 時柱
  let hStem = '';
  let hBranch = '';
  if (hasHour) {
    hBranch = BRANCHES[hourBranchIdx];
    // 五鼠遁日
    const startStemIdx = ((dStemIdx % 5) * 2) % 10;
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
    riPoBranch,
    sunLongitude: sunLon,
    nearJie,
    termWarning,
  };
}

/**
 * 依農曆生辰計算終身卦數字（邵康節梅花命卦法）
 *   上卦 = (年支數 + 農曆月 + 農曆日) ÷ 8 取餘
 *   下卦 = (年支數 + 農曆月 + 農曆日 + 時支數) ÷ 8 取餘
 *   動爻 = 同一總和 ÷ 6 取餘
 * 傳統梅花命卦必須有時辰才能定下卦與動爻。無時辰時以下方「權宜法」補位，
 * 並以 heuristic = true 標示：這不是傳統法，僅供參考。
 */
export function calculateDestinyHexNumbers(lunarYear, lunarMonth, lunarDay, hourBranchIdx = null) {
  // 年支數：子=1, 丑=2, ... 亥=12
  const yOffset = (lunarYear - 4) % 12; // 2024 甲辰年 辰=5
  const yearBranchNum = yOffset >= 0 ? yOffset + 1 : yOffset + 13;
  const monthNum = parseInt(lunarMonth, 10);
  const dayNum = parseInt(lunarDay, 10);

  const upperSum = yearBranchNum + monthNum + dayNum;
  let upper = upperSum % 8;
  if (upper === 0) upper = 8;

  const hasHour = hourBranchIdx !== null && hourBranchIdx !== undefined && hourBranchIdx >= 0;
  let lower;
  let moving;

  if (hasHour) {
    const totalSum = upperSum + hourBranchIdx + 1; // 子=1 ... 亥=12
    lower = totalSum % 8 || 8;
    moving = totalSum % 6 || 6;
  } else {
    // 權宜法（非傳統）：缺時辰時，下卦取 月+日，動爻取上卦總和
    lower = (monthNum + dayNum) % 8 || 8;
    moving = upperSum % 6 || 6;
  }

  // 映射到系統內部 TRIGRAM key (1~7, 0代表坤8)
  const toTrigramKey = (num) => num === 8 ? 0 : num;

  return {
    num1: upperSum,
    num2: hasHour ? (upperSum + hourBranchIdx + 1) : (monthNum + dayNum),
    num3: hasHour ? (upperSum + hourBranchIdx + 1) : upperSum,
    upperTrigramId: toTrigramKey(upper),
    lowerTrigramId: toTrigramKey(lower),
    movingLine: moving,
    hasHour,
    heuristic: !hasHour,
  };
}
