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

  let lYear = sYear, lMonth = sMonth, lDay = sDay;
  if (f.calendarType === 'solar') {
    const lunar = solarToLunar(sYear, sMonth, sDay);
    lYear = lunar.lunarYear;
    lMonth = lunar.lunarMonth;
    lDay = lunar.lunarDay;
  } else {
    const solar = lunarToSolar(lYear, lMonth, lDay);
    sYear = solar.year;
    sMonth = solar.month;
    sDay = solar.day;
  }

  const hIdx = f.hourIdx !== '' && f.hourIdx !== null && f.hourIdx !== undefined ? parseInt(f.hourIdx, 10) : null;
  const pillars = calculatePillars(sYear, sMonth, sDay, hIdx);
  const hexNums = calculateDestinyHexNumbers(lYear, lMonth, lDay, hIdx);

  const uMod = hexNums.upperTrigramId;
  const lMod = hexNums.lowerTrigramId;
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
    calendarType: f.calendarType,
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
    name: f.name || '命主',
    gender: f.gender,
    uTrigram: TRIGRAMS[uMod],
    lTrigram: TRIGRAMS[lMod],
    linesData,
    palaceInfo,
  };
}
