/**
 * 易經終身命卦運算（自 App.jsx 抽出，供個人終身卦與全維報告共用）
 */
import { TRIGRAMS, BRANCH_WUXING, NAJIA_TABLE, BRANCHES } from '../data/constants.js';
import {
  getRelation, getSixBeasts, findPalaceAndShi, getHexData,
  findNuclearHexagram, generateDestinyReport,
} from './iching.js';
import {
  solarToLunar, lunarToSolar, calculatePillars, calculateDestinyHexNumbers,
} from './lunar.js';

/** 24 小時制時間 → 十二時辰索引（子=0 … 亥=11；23:00-00:59 皆為子） */
export function clockToHourIdx(hour) {
  const h = ((parseInt(hour, 10) % 24) + 24) % 24;
  return h === 23 ? 0 : Math.floor((h + 1) / 2) % 12;
}

/**
 * @param {Object} f  { name, calendarType:'solar'|'lunar', year, month, day, hourIdx:''|0-11, gender }
 */
export function computeDestiny(f) {
  let sYear = parseInt(f.year, 10);
  let sMonth = parseInt(f.month, 10);
  let sDay = parseInt(f.day, 10);
  let hIdx = f.hourIdx !== '' && f.hourIdx !== null && f.hourIdx !== undefined ? parseInt(f.hourIdx, 10) : null;
  let calendarType = f.calendarType;

  // 傳入 resolveMoment() 的結果時，採用其「有效日期與時辰」（真太陽時、夜子時換日、歷史時區）
  if (f.moment) {
    const c = f.moment.chinese;
    sYear = c.year; sMonth = c.month; sDay = c.day; hIdx = c.hourIdx;
    calendarType = 'solar';
    // 出生時間不詳：不採用時辰（時柱、梅花下卦與動爻皆不排，改走明示的權宜法）
    if (f.timeUnknown) hIdx = null;
  }

  let lYear = sYear, lMonth = sMonth, lDay = sDay;
  if (calendarType === 'solar') {
    const lunar = solarToLunar(sYear, sMonth, sDay);
    lYear = lunar.lunarYear;
    lMonth = lunar.lunarMonth;
    lDay = lunar.lunarDay;
  } else {
    const solar = lunarToSolar(lYear, lMonth, lDay, !!f.isLeapMonth);
    sYear = solar.year;
    sMonth = solar.month;
    sDay = solar.day;
  }

  const pillars = calculatePillars(sYear, sMonth, sDay, hIdx, { utc: f.moment?.utc });
  const hexNums = calculateDestinyHexNumbers(lYear, lMonth, lDay, hIdx);

  const notes = [];
  if (pillars.termWarning) notes.push(pillars.termWarning);
  if (hexNums.heuristic) notes.push('未提供出生時辰：傳統梅花命卦必須有時辰才能定下卦與動爻，此卦以「權宜法」補位（非傳統），僅供參考。');

  const uMod = hexNums.upperTrigramId;
  const lMod = hexNums.lowerTrigramId;
  notes.push('流派提醒：梅花數（邵康節）起卦與京房納甲（六親、六神、世應）屬不同傳統，本站把梅花命卦套上納甲排盤是現代整合用法，並非古法原貌；六親、六神僅作性格與關係的象徵參考，不作吉凶定論。');
  const palaceInfo = findPalaceAndShi(uMod, lMod);
  const sixBeasts = getSixBeasts(pillars.dayStem);

  const allBranches = [...NAJIA_TABLE[lMod].inner, ...NAJIA_TABLE[uMod].outer];

  const getBits = (bin) => bin.split('').map(Number);
  const lBits = getBits(TRIGRAMS[lMod].binary);
  const uBits = getBits(TRIGRAMS[uMod].binary);
  const allLinesBits = [lBits[2], lBits[1], lBits[0], uBits[2], uBits[1], uBits[0]];

  const linesData = [];
  for (let i = 0; i < 6; i++) {
    const lineNum = i + 1;
    const branch = allBranches[i];
    const wuxing = BRANCH_WUXING[branch];
    linesData.push({
      lineNum,
      bit: allLinesBits[i],
      branch,
      wuxing,
      relation: getRelation(palaceInfo.palaceWuxing, wuxing),
      beast: sixBeasts[i],
      isShi: palaceInfo.shi === lineNum,
      isYing: palaceInfo.ying === lineNum,
    });
  }

  const originalHex = getHexData(uMod, lMod);
  const nuclearHex = findNuclearHexagram(uMod, lMod);

  const report = generateDestinyReport({
    birthdayStr: `${f.year}年${f.month}月${f.day}日`,
    calendarType,
    hasHour: hIdx !== null,
    hourBranch: hIdx !== null ? BRANCHES[hIdx] : null,
    pillars,
    originalHex,
    nuclearHex,
    palaceInfo,
    linesData,
  });

  return {
    ...report,
    notes,
    lunar: { year: lYear, month: lMonth, day: lDay },
    pillarsRaw: pillars,
    name: f.name || '命主',
    gender: f.gender,
    uTrigram: TRIGRAMS[uMod],
    lTrigram: TRIGRAMS[lMod],
    linesData,
    palaceInfo,
  };
}
