/**
 * 西洋占星天文計算引擎 - 純前端高精度版本
 * 計算行星黃道位置、十二星座、宮位（整宮制）與主要相位
 * 精度：約 ±0.1° 以內（適合日常命理解析使用）
 */

import { bodyLongitude, ascendantAndMc, localToUtcDate, norm360 } from './ephemeris.js';

// ─────────────────────────────────────────────────────────────────────────────
// 常數與對照表
// ─────────────────────────────────────────────────────────────────────────────

export const ZODIAC_SIGNS = [
  { name: '牡羊座', symbol: '♈', start: 0, element: '火', mode: '基本', ruling: '火星' },
  { name: '金牛座', symbol: '♉', start: 30, element: '土', mode: '固定', ruling: '金星' },
  { name: '雙子座', symbol: '♊', start: 60, element: '風', mode: '變動', ruling: '水星' },
  { name: '巨蟹座', symbol: '♋', start: 90, element: '水', mode: '基本', ruling: '月亮' },
  { name: '獅子座', symbol: '♌', start: 120, element: '火', mode: '固定', ruling: '太陽' },
  { name: '處女座', symbol: '♍', start: 150, element: '土', mode: '變動', ruling: '水星' },
  { name: '天秤座', symbol: '♎', start: 180, element: '風', mode: '基本', ruling: '金星' },
  { name: '天蠍座', symbol: '♏', start: 210, element: '水', mode: '固定', ruling: '冥王星/火星' },
  { name: '射手座', symbol: '♐', start: 240, element: '火', mode: '變動', ruling: '木星' },
  { name: '摩羯座', symbol: '♑', start: 270, element: '土', mode: '基本', ruling: '土星' },
  { name: '水瓶座', symbol: '♒', start: 300, element: '風', mode: '固定', ruling: '天王星/土星' },
  { name: '雙魚座', symbol: '♓', start: 330, element: '水', mode: '變動', ruling: '海王星/木星' },
];

export const PLANETS = [
  { id: 'sun', name: '太陽', symbol: '☉', chName: '太陽', glyph: '☀️' },
  { id: 'moon', name: '月亮', symbol: '☽', chName: '月亮', glyph: '🌙' },
  { id: 'mercury', name: '水星', symbol: '☿', chName: '水星', glyph: '☿️' },
  { id: 'venus', name: '金星', symbol: '♀', chName: '金星', glyph: '♀️' },
  { id: 'mars', name: '火星', symbol: '♂', chName: '火星', glyph: '♂️' },
  { id: 'jupiter', name: '木星', symbol: '♃', chName: '木星', glyph: '♃' },
  { id: 'saturn', name: '土星', symbol: '♄', chName: '土星', glyph: '♄' },
  { id: 'uranus', name: '天王星', symbol: '♅', chName: '天王星', glyph: '♅' },
  { id: 'neptune', name: '海王星', symbol: '♆', chName: '海王星', glyph: '♆' },
  { id: 'pluto', name: '冥王星', symbol: '♇', chName: '冥王星', glyph: '♇' },
  { id: 'asc', name: '上升點', symbol: 'AC', chName: '上升', glyph: '↑' },
  { id: 'mc', name: '天頂', symbol: 'MC', chName: '天頂', glyph: '⬆' },
];

// 相位定義
export const ASPECTS = [
  { name: '合相', symbol: '☌', angle: 0, orb: 8, nature: 'major', color: '#f59e0b' },
  { name: '六分相', symbol: '⚹', angle: 60, orb: 6, nature: 'minor', color: '#3b82f6' },
  { name: '四分相', symbol: '□', angle: 90, orb: 8, nature: 'major', color: '#ef4444' },
  { name: '三分相', symbol: '△', angle: 120, orb: 8, nature: 'major', color: '#10b981' },
  { name: '對分相', symbol: '☍', angle: 180, orb: 8, nature: 'major', color: '#8b5cf6' },
  { name: '十二分之五相', symbol: 'Q', angle: 150, orb: 2, nature: 'minor', color: '#6b7280' },
];

// 常用城市座標
export const CITY_LIST = [
  { name: '台北', lat: 25.0330, lon: 121.5654, tz: 8 },
  { name: '台中', lat: 24.1477, lon: 120.6736, tz: 8 },
  { name: '台南', lat: 22.9999, lon: 120.2270, tz: 8 },
  { name: '高雄', lat: 22.6273, lon: 120.3014, tz: 8 },
  { name: '香港', lat: 22.3193, lon: 114.1694, tz: 8 },
  { name: '澳門', lat: 22.1987, lon: 113.5439, tz: 8 },
  { name: '北京', lat: 39.9042, lon: 116.4074, tz: 8 },
  { name: '上海', lat: 31.2304, lon: 121.4737, tz: 8 },
  { name: '廣州', lat: 23.1291, lon: 113.2644, tz: 8 },
  { name: '深圳', lat: 22.5431, lon: 114.0579, tz: 8 },
  { name: '成都', lat: 30.5728, lon: 104.0668, tz: 8 },
  { name: '武漢', lat: 30.5928, lon: 114.3055, tz: 8 },
  { name: '新加坡', lat: 1.3521, lon: 103.8198, tz: 8 },
  { name: '吉隆坡', lat: 3.1390, lon: 101.6869, tz: 8 },
  { name: '東京', lat: 35.6762, lon: 139.6503, tz: 9 },
  { name: '首爾', lat: 37.5665, lon: 126.9780, tz: 9 },
  { name: '紐約', lat: 40.7128, lon: -74.0060, tz: -5 },
  { name: '倫敦', lat: 51.5074, lon: -0.1278, tz: 0 },
  { name: '新竹', lat: 24.8138, lon: 120.9675, tz: 8 },
  { name: '桃園', lat: 24.9936, lon: 121.3010, tz: 8 },
  { name: '花蓮', lat: 23.9871, lon: 121.6015, tz: 8 },
  { name: '台東', lat: 22.7583, lon: 121.1444, tz: 8 },
  { name: '西安', lat: 34.3416, lon: 108.9398, tz: 8 },
  { name: '重慶', lat: 29.5630, lon: 106.5516, tz: 8 },
  { name: '杭州', lat: 30.2741, lon: 120.1551, tz: 8 },
  { name: '南京', lat: 32.0603, lon: 118.7969, tz: 8 },
  { name: '曼谷', lat: 13.7563, lon: 100.5018, tz: 7 },
  { name: '悉尼', lat: -33.8688, lon: 151.2093, tz: 10 },
  { name: '洛杉磯', lat: 34.0522, lon: -118.2437, tz: -8 },
  { name: '舊金山', lat: 37.7749, lon: -122.4194, tz: -8 },
  { name: '多倫多', lat: 43.6532, lon: -79.3832, tz: -5 },
  { name: '巴黎', lat: 48.8566, lon: 2.3522, tz: 1 },
  { name: '柏林', lat: 52.5200, lon: 13.4050, tz: 1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// 核心天文計算（底層由 ephemeris.js 提供高精度星曆）
// ─────────────────────────────────────────────────────────────────────────────

/** 儒略日（保留匯出相容） */
export function dateToJD(year, month, day, hourUTC = 0) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hourUTC / 24 + B - 1524.5;
}

/**
 * 根據黃道經度返回星座資訊
 */
export function getLongitudeSign(lon) {
  const l = norm360(lon);
  const idx = Math.floor(l / 30);
  const sign = ZODIAC_SIGNS[idx];
  const degree = l - idx * 30;
  return {
    ...sign,
    lon: l,
    degree,
    degreeStr: `${sign.name} ${Math.floor(degree)}°${Math.floor((degree % 1) * 60)}'`,
  };
}

/**
 * 兩個黃道經度之間的相位
 */
export function aspectBetween(lon1, lon2, orbScale = 1) {
  let diff = Math.abs(norm360(lon1) - norm360(lon2));
  if (diff > 180) diff = 360 - diff;
  for (const asp of ASPECTS) {
    if (Math.abs(diff - asp.angle) <= asp.orb * orbScale) {
      return { ...asp, exactDiff: diff, orb: Math.abs(diff - asp.angle) };
    }
  }
  return null;
}

/**
 * 完整計算西洋星盤
 * @param {Object} params
 * @param {number} params.year,month,day  本地出生日期（西元）
 * @param {number} params.hour,minute     本地出生時間
 * @param {number} params.lat,lon         出生地緯度、經度（東正）
 * @param {number} params.tz              出生當地與 UTC 時差（小時，台灣 +8）
 */
export function calculateAstroChart({ year, month, day, hour = 12, minute = 0, lat = 25.03, lon = 121.57, tz = 8 }) {
  const date = localToUtcDate({ year, month, day, hour, minute, tz });
  if (Number.isNaN(date.getTime())) throw new Error('出生日期或時間無效');

  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;

  const planetIds = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const positions = {};
  for (const id of planetIds) {
    const l = bodyLongitude(id, date);
    positions[id] = { id, lon: l, sign: getLongitudeSign(l) };
  }

  const { asc: ascLon, mc: mcLon } = ascendantAndMc(date, lat, lon);
  positions.asc = { id: 'asc', lon: ascLon, sign: getLongitudeSign(ascLon) };
  positions.mc = { id: 'mc', lon: mcLon, sign: getLongitudeSign(mcLon) };

  // 整宮制：上升星座所在星座為第一宮
  const firstHouseStart = Math.floor(ascLon / 30) * 30;
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const cusp = norm360(firstHouseStart + i * 30);
    houses.push({ house: i + 1, lon: cusp, sign: getLongitudeSign(cusp) });
  }
  for (const id of [...planetIds, 'mc']) {
    positions[id].house = Math.floor(norm360(positions[id].lon - firstHouseStart) / 30) + 1;
  }

  const keyPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'asc'];
  const aspects = [];
  for (let i = 0; i < keyPlanets.length; i++) {
    for (let j = i + 1; j < keyPlanets.length; j++) {
      const p1 = keyPlanets[i];
      const p2 = keyPlanets[j];
      const asp = aspectBetween(positions[p1].lon, positions[p2].lon);
      if (asp) {
        aspects.push({
          planet1: p1,
          planet2: p2,
          planet1Sign: positions[p1].sign.name,
          planet2Sign: positions[p2].sign.name,
          ...asp,
        });
      }
    }
  }

  return {
    jd, T, positions, houses, aspects,
    sun: positions.sun,
    moon: positions.moon,
    asc: positions.asc,
    mc: positions.mc,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 雙人星盤合盤（Synastry）
// ─────────────────────────────────────────────────────────────────────────────

const SYN_LABEL = { sun: '太陽', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', asc: '上升' };
const SYN_PAIRS = [
  ['sun', 'moon', 3, '靈魂共鳴'], ['moon', 'sun', 3, '靈魂共鳴'],
  ['sun', 'sun', 2, '靈魂共鳴'],
  ['asc', 'sun', 2, '靈魂共鳴'], ['sun', 'asc', 2, '靈魂共鳴'],
  ['asc', 'moon', 2, '靈魂共鳴'], ['moon', 'asc', 2, '靈魂共鳴'],
  ['moon', 'moon', 2.5, '情感溝通'],
  ['moon', 'venus', 2.5, '情感溝通'], ['venus', 'moon', 2.5, '情感溝通'],
  ['mercury', 'mercury', 2, '情感溝通'],
  ['mercury', 'moon', 1.5, '情感溝通'], ['moon', 'mercury', 1.5, '情感溝通'],
  ['venus', 'mars', 3, '吸引力'], ['mars', 'venus', 3, '吸引力'],
  ['sun', 'venus', 2, '吸引力'], ['venus', 'sun', 2, '吸引力'],
  ['venus', 'venus', 2, '吸引力'],
  ['mars', 'mars', 1.5, '吸引力'],
  ['moon', 'mars', 1.5, '吸引力'], ['mars', 'moon', 1.5, '吸引力'],
];
const HARMONIOUS = new Set(['合相', '三分相', '六分相']);
const TENSION = new Set(['四分相', '對分相']);

/**
 * 兩張本命盤的跨盤相位與契合度
 * @returns {{score:number, aspects:Array, themeScore:Object}}
 */
export function calculateSynastry(chartA, chartB) {
  const found = [];
  let raw = 0;
  let maxRaw = 0;
  const themes = { 靈魂共鳴: 0, 情感溝通: 0, 吸引力: 0 };
  const themeMax = { 靈魂共鳴: 0, 情感溝通: 0, 吸引力: 0 };

  for (const [a, b, w, theme] of SYN_PAIRS) {
    maxRaw += w;
    themeMax[theme] += w;
    const asp = aspectBetween(chartA.positions[a].lon, chartB.positions[b].lon, 0.85);
    if (!asp || asp.angle === 150) continue;
    const strength = 1 - (asp.orb / (asp.orb + 8)) * 0.6;
    let tone = 'neutral';
    let val = 0;
    if (HARMONIOUS.has(asp.name)) { tone = 'harmonious'; val = w * strength; }
    else if (TENSION.has(asp.name)) { tone = 'tension'; val = -w * 0.3 * strength; }
    raw += val;
    themes[theme] += val;
    found.push({ a, b, labelA: SYN_LABEL[a], labelB: SYN_LABEL[b], name: asp.name, symbol: asp.symbol, orb: asp.orb, theme, tone });
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const score = clamp(Math.round(50 + (raw / maxRaw) * 90), 30, 95);
  const themeScore = {};
  for (const k of Object.keys(themes)) {
    themeScore[k] = clamp(Math.round(50 + (themes[k] / (themeMax[k] || 1)) * 90), 30, 98);
  }
  found.sort((x, y) => x.orb - y.orb);
  return { score, aspects: found, themeScore };
}

/**
 * 組裝西洋占星 AI Prompt
 */
export function generateAstrologyAiPrompt(chart, personName = '命主') {
  if (!chart) return '';

  const { positions, aspects } = chart;
  const keyPlanetNames = { sun: '太陽', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星', asc: '上升' };
  
  const planetDesc = Object.entries(keyPlanetNames)
    .map(([id, name]) => `${name}：${positions[id]?.sign.name}（${positions[id]?.sign.degreeStr}）`)
    .join('、');

  const aspectDesc = aspects
    .filter((a) => a.nature === 'major')
    .slice(0, 10)
    .map((a) => {
      const p1name = keyPlanetNames[a.planet1] || a.planet1;
      const p2name = keyPlanetNames[a.planet2] || a.planet2;
      return `${p1name}${a.name}${p2name}（容許度 ${a.orb.toFixed(1)}°）`;
    })
    .join('、');

  return `您好，請以當代頂尖西洋占星心理學大師的視角，為【${personName}】的本命星盤（Natal Chart）進行深度解析：

【行星星座位置】：
${planetDesc}

【主要相位列表（大相位）】：
${aspectDesc || '相位資料計算中'}

【請為命主提供以下六大維度的深度解析】：

一、【靈魂本質與人生使命】：
   - 太陽星座：命主的意識身分認同、核心使命與生命主題。
   - 上升星座（ASC）：命主向世界展現的外在人格面具、第一印象與身體氣質。

二、【情感與潛意識深層結構】：
   - 月亮星座：情感需求、安全感模式、與家庭/母親的深層連結。
   
三、【溝通思維與學習模式】：
   - 水星星座：思考方式、表達風格與溝通策略。

四、【愛情觀與關係模式】：
   - 金星星座：愛的語言、吸引力類型與伴侶期待。
   - 火星星座：行動力、慾望表達方式與性格底層驅動力。

五、【社會角色與制約挑戰（木星/土星）】：
   - 木星星座：人生幸運領域與擴展方向。
   - 土星星座：人生挑戰、業力課題與最終成熟的領域。

六、【關鍵相位深讀與整體人生格局總評】：
   請特別解析最強大的相位對命主性格與人生路徑的深遠影響，並以一段充滿洞見的話語作結。`;
}
