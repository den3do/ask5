/**
 * 西洋占星天文計算引擎 - 純前端高精度版本
 * 計算行星黃道位置、十二星座、宮位（整宮制）與主要相位
 * 精度：約 ±0.1° 以內（適合日常命理解析使用）
 */

import { bodyLongitude, ascendantAndMc, localToUtcDate, norm360, norm180 } from './ephemeris.js';

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

// 常用城市座標（tz 為現行標準時區；zone 為 IANA 時區，用於換算歷史時區與夏令時間）
export const CITY_LIST = [
  { name: '台北', lat: 25.0330, lon: 121.5654, tz: 8, zone: 'Asia/Taipei' },
  { name: '台中', lat: 24.1477, lon: 120.6736, tz: 8, zone: 'Asia/Taipei' },
  { name: '台南', lat: 22.9999, lon: 120.2270, tz: 8, zone: 'Asia/Taipei' },
  { name: '高雄', lat: 22.6273, lon: 120.3014, tz: 8, zone: 'Asia/Taipei' },
  { name: '香港', lat: 22.3193, lon: 114.1694, tz: 8, zone: 'Asia/Hong_Kong' },
  { name: '澳門', lat: 22.1987, lon: 113.5439, tz: 8, zone: 'Asia/Macau' },
  { name: '北京', lat: 39.9042, lon: 116.4074, tz: 8, zone: 'Asia/Shanghai' },
  { name: '上海', lat: 31.2304, lon: 121.4737, tz: 8, zone: 'Asia/Shanghai' },
  { name: '廣州', lat: 23.1291, lon: 113.2644, tz: 8, zone: 'Asia/Shanghai' },
  { name: '深圳', lat: 22.5431, lon: 114.0579, tz: 8, zone: 'Asia/Shanghai' },
  { name: '成都', lat: 30.5728, lon: 104.0668, tz: 8, zone: 'Asia/Shanghai' },
  { name: '武漢', lat: 30.5928, lon: 114.3055, tz: 8, zone: 'Asia/Shanghai' },
  { name: '新加坡', lat: 1.3521, lon: 103.8198, tz: 8, zone: 'Asia/Singapore' },
  { name: '吉隆坡', lat: 3.1390, lon: 101.6869, tz: 8, zone: 'Asia/Kuala_Lumpur' },
  { name: '東京', lat: 35.6762, lon: 139.6503, tz: 9, zone: 'Asia/Tokyo' },
  { name: '首爾', lat: 37.5665, lon: 126.9780, tz: 9, zone: 'Asia/Seoul' },
  { name: '紐約', lat: 40.7128, lon: -74.0060, tz: -5, zone: 'America/New_York' },
  { name: '倫敦', lat: 51.5074, lon: -0.1278, tz: 0, zone: 'Europe/London' },
  { name: '新竹', lat: 24.8138, lon: 120.9675, tz: 8, zone: 'Asia/Taipei' },
  { name: '桃園', lat: 24.9936, lon: 121.3010, tz: 8, zone: 'Asia/Taipei' },
  { name: '花蓮', lat: 23.9871, lon: 121.6015, tz: 8, zone: 'Asia/Taipei' },
  { name: '台東', lat: 22.7583, lon: 121.1444, tz: 8, zone: 'Asia/Taipei' },
  { name: '西安', lat: 34.3416, lon: 108.9398, tz: 8, zone: 'Asia/Shanghai' },
  { name: '重慶', lat: 29.5630, lon: 106.5516, tz: 8, zone: 'Asia/Shanghai' },
  { name: '杭州', lat: 30.2741, lon: 120.1551, tz: 8, zone: 'Asia/Shanghai' },
  { name: '南京', lat: 32.0603, lon: 118.7969, tz: 8, zone: 'Asia/Shanghai' },
  { name: '曼谷', lat: 13.7563, lon: 100.5018, tz: 7, zone: 'Asia/Bangkok' },
  { name: '悉尼', lat: -33.8688, lon: 151.2093, tz: 10, zone: 'Australia/Sydney' },
  { name: '洛杉磯', lat: 34.0522, lon: -118.2437, tz: -8, zone: 'America/Los_Angeles' },
  { name: '舊金山', lat: 37.7749, lon: -122.4194, tz: -8, zone: 'America/Los_Angeles' },
  { name: '多倫多', lat: 43.6532, lon: -79.3832, tz: -5, zone: 'America/Toronto' },
  { name: '巴黎', lat: 48.8566, lon: 2.3522, tz: 1, zone: 'Europe/Paris' },
  { name: '柏林', lat: 52.5200, lon: 13.4050, tz: 1, zone: 'Europe/Berlin' },
  { name: '基隆', lat: 25.1276, lon: 121.7392, tz: 8, zone: 'Asia/Taipei' },
  { name: '嘉義', lat: 23.4801, lon: 120.4491, tz: 8, zone: 'Asia/Taipei' },
  { name: '彰化', lat: 24.0518, lon: 120.5161, tz: 8, zone: 'Asia/Taipei' },
  { name: '屏東', lat: 22.6828, lon: 120.4877, tz: 8, zone: 'Asia/Taipei' },
  { name: '宜蘭', lat: 24.7021, lon: 121.7378, tz: 8, zone: 'Asia/Taipei' },
  { name: '苗栗', lat: 24.5602, lon: 120.8214, tz: 8, zone: 'Asia/Taipei' },
  { name: '南投', lat: 23.9609, lon: 120.9719, tz: 8, zone: 'Asia/Taipei' },
  { name: '雲林（斗六）', lat: 23.7092, lon: 120.5431, tz: 8, zone: 'Asia/Taipei' },
  { name: '澎湖（馬公）', lat: 23.5711, lon: 119.5793, tz: 8, zone: 'Asia/Taipei' },
  { name: '金門', lat: 24.4493, lon: 118.3767, tz: 8, zone: 'Asia/Taipei' },
  { name: '天津', lat: 39.3434, lon: 117.3616, tz: 8, zone: 'Asia/Shanghai' },
  { name: '福州', lat: 26.0745, lon: 119.2965, tz: 8, zone: 'Asia/Shanghai' },
  { name: '廈門', lat: 24.4798, lon: 118.0894, tz: 8, zone: 'Asia/Shanghai' },
  { name: '青島', lat: 36.0671, lon: 120.3826, tz: 8, zone: 'Asia/Shanghai' },
  { name: '長沙', lat: 28.2282, lon: 112.9388, tz: 8, zone: 'Asia/Shanghai' },
  { name: '鄭州', lat: 34.7466, lon: 113.6254, tz: 8, zone: 'Asia/Shanghai' },
  { name: '昆明', lat: 25.0389, lon: 102.7183, tz: 8, zone: 'Asia/Shanghai' },
  { name: '瀋陽', lat: 41.8057, lon: 123.4315, tz: 8, zone: 'Asia/Shanghai' },
  { name: '哈爾濱', lat: 45.8038, lon: 126.5349, tz: 8, zone: 'Asia/Shanghai' },
  { name: '烏魯木齊', lat: 43.8256, lon: 87.6168, tz: 8, zone: 'Asia/Shanghai' },
  { name: '大阪', lat: 34.6937, lon: 135.5023, tz: 9, zone: 'Asia/Tokyo' },
  { name: '胡志明市', lat: 10.8231, lon: 106.6297, tz: 7, zone: 'Asia/Ho_Chi_Minh' },
  { name: '馬尼拉', lat: 14.5995, lon: 120.9842, tz: 8, zone: 'Asia/Manila' },
  { name: '雅加達', lat: -6.2088, lon: 106.8456, tz: 7, zone: 'Asia/Jakarta' },
  { name: '芝加哥', lat: 41.8781, lon: -87.6298, tz: -6, zone: 'America/Chicago' },
  { name: '溫哥華', lat: 49.2827, lon: -123.1207, tz: -8, zone: 'America/Vancouver' },
  { name: '墨爾本', lat: -37.8136, lon: 144.9631, tz: 10, zone: 'Australia/Melbourne' },
  { name: '奧克蘭', lat: -36.8485, lon: 174.7633, tz: 12, zone: 'Pacific/Auckland' },
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
/** 各天體的容許度係數：日月最寬，外行星與交點、軸點較窄（避免相位過度氾濫） */
export const ORB_FACTOR = {
  sun: 1, moon: 1, mercury: 0.85, venus: 0.85, mars: 0.85, jupiter: 0.75, saturn: 0.75,
  uranus: 0.6, neptune: 0.6, pluto: 0.6, northNode: 0.5, asc: 0.75, mc: 0.75,
};

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
export function calculateAstroChart({ year, month, day, hour = 12, minute = 0, lat = 25.03, lon = 121.57, tz = 8, timeKnown = true }) {
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

  const nnLon = bodyLongitude('northNode', date);
  positions.northNode = { id: 'northNode', lon: nnLon, sign: getLongitudeSign(nnLon) };

  // 出生時間不詳：上升與宮位無法確定，改採「太陽盤」（以太陽星座為第一宮）並明確標示
  let ascLon; let mcLon;
  if (timeKnown) {
    ({ asc: ascLon, mc: mcLon } = ascendantAndMc(date, lat, lon));
  } else {
    ascLon = positions.sun.lon;
    mcLon = norm360(positions.sun.lon - 90);
  }
  positions.asc = { id: 'asc', lon: ascLon, sign: getLongitudeSign(ascLon) };
  positions.mc = { id: 'mc', lon: mcLon, sign: getLongitudeSign(mcLon) };

  // 整宮制：上升星座所在星座為第一宮
  const firstHouseStart = Math.floor(ascLon / 30) * 30;
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const cusp = norm360(firstHouseStart + i * 30);
    houses.push({ house: i + 1, lon: cusp, sign: getLongitudeSign(cusp) });
  }
  for (const id of [...planetIds, 'northNode', 'mc']) {
    positions[id].house = Math.floor(norm360(positions[id].lon - firstHouseStart) / 30) + 1;
  }

  const keyPlanets = [...planetIds, 'northNode', ...(timeKnown ? ['asc', 'mc'] : [])];
  const aspects = [];
  for (let i = 0; i < keyPlanets.length; i++) {
    for (let j = i + 1; j < keyPlanets.length; j++) {
      const p1 = keyPlanets[i];
      const p2 = keyPlanets[j];
      // 軸點與交點之間、軸點與軸點之間的相位意義不大，略過
      if (['asc', 'mc', 'northNode'].includes(p1) && ['asc', 'mc', 'northNode'].includes(p2)) continue;
      const asp = aspectBetween(positions[p1].lon, positions[p2].lon, Math.min(ORB_FACTOR[p1] ?? 1, ORB_FACTOR[p2] ?? 1));
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

  const warnings = [];
  let moonSigns = null;
  if (!timeKnown) {
    // 月亮一天走約 13°：檢查當日 00:00–24:00 是否換星座
    const d0 = localToUtcDate({ year, month, day, hour: 0, minute: 0, tz });
    const d1 = new Date(d0.getTime() + 86400000);
    const m0 = getLongitudeSign(bodyLongitude('moon', d0));
    const m1 = getLongitudeSign(bodyLongitude('moon', d1));
    moonSigns = [m0, m1];
    warnings.push('出生時間不詳：上升、天頂與宮位無法確定，本盤改採「太陽盤」（以太陽星座為第一宮），宮位與上升僅供參考，已不納入上升相位。');
    warnings.push(m0.name === m1.name
      ? `月亮當天停留在${m0.name}，月亮星座可確定，但度數（及月亮相位）不準。`
      : `月亮當天由${m0.name}移入${m1.name}，月亮星座無法確定（本盤以中午估算：${positions.moon.sign.name}）。`);
  }
  if (Math.abs(lat) > 66) warnings.push('出生地緯度超過 66°（極圈附近），上升點與宮位在此區域會嚴重失真，僅供參考。');
  if (Math.abs(lat) > 60 && Math.abs(lat) <= 66) warnings.push('出生地緯度高於 60°，上升點對出生時間極為敏感。');

  return {
    warnings, timeUnknown: !timeKnown, moonSigns, houseSystem: '整宮制（Whole Sign）',
    jd, T, positions, houses, aspects, birthDate: date,
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
  const keyPlanetNames = { sun: '太陽', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星', uranus: '天王星', neptune: '海王星', pluto: '冥王星', northNode: '北交點', asc: '上升', mc: '天頂' };
  const known = !chart.timeUnknown;
  const caveat = [`宮位制：${chart.houseSystem}`, ...(chart.warnings || [])].join('；');
  
  const planetDesc = Object.entries(keyPlanetNames)
    .filter(([id]) => known || (id !== 'asc' && id !== 'mc'))
    .map(([id, name]) => `${name}：${positions[id]?.sign.name}（${positions[id]?.sign.degreeStr}）${known && positions[id]?.house ? `第${positions[id].house}宮` : ''}`)
    .join('、');

  const aspectDesc = aspects
    .filter((a) => a.nature === 'major')
    .sort((x, y) => x.orb - y.orb)
    .slice(0, 12)
    .map((a) => {
      const p1name = keyPlanetNames[a.planet1] || a.planet1;
      const p2name = keyPlanetNames[a.planet2] || a.planet2;
      return `${p1name}${a.name}${p2name}（容許度 ${a.orb.toFixed(1)}°）`;
    })
    .join('、');

  return `您好，請以當代頂尖西洋占星心理學大師的視角，為【${personName}】的本命星盤（Natal Chart）進行深度解析：

【行星星座位置】：
${planetDesc}
【排盤約定與限制（請遵守，勿過度確定）】：${caveat}

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

// ─────────────────────────────────────────────────────────────────────────────
// 依本命盤實算的人生行運時間點（土星回歸、木星回歸、天王星對分、北交點回歸）
// ─────────────────────────────────────────────────────────────────────────────
const YEAR_MS = 365.2425 * 86400000;

/** 在 [fromAge, toAge] 歲內，找出行運 planet 與目標黃經 target 精確相合的年齡（可能多次，因逆行） */
function findTransitAges(id, target, birthDate, fromAge, toAge, stepDays = 15) {
  const hits = [];
  const t0 = birthDate.getTime();
  let prevT = t0 + fromAge * YEAR_MS;
  let prevD = norm180(bodyLongitude(id, new Date(prevT)) - target);
  for (let t = prevT + stepDays * 86400000; t <= t0 + toAge * YEAR_MS; t += stepDays * 86400000) {
    const d = norm180(bodyLongitude(id, new Date(t)) - target);
    if (Math.sign(d) !== Math.sign(prevD) && Math.abs(d) < 20 && Math.abs(prevD) < 20) {
      const frac = Math.abs(prevD) / (Math.abs(prevD) + Math.abs(d));
      hits.push((prevT + frac * (t - prevT) - t0) / YEAR_MS);
    }
    prevT = t; prevD = d;
  }
  return hits;
}

const fmtAges = (a) => (a.length ? (a.length === 1 ? `約 ${a[0].toFixed(1)} 歲` : `約 ${a.map((x) => x.toFixed(1)).join('、')} 歲（行星逆行，多次精確）`) : '範圍內無精確相位');

/**
 * 以本命盤實算的行運時間。回傳 [{key, title, ages:[...], text}]
 * 只含幾個最具代表性、可由本命位置直接求得的週期；不含全面行運／推運。
 */
export function calculateLifeTransits(chart) {
  const birth = chart.birthDate;
  if (!birth) return [];
  const pos = chart.positions;
  const list = [];
  const sat = findTransitAges('saturn', pos.saturn.lon, birth, 26, 32);
  list.push({ key: 'satReturn1', title: '第一次土星回歸', ages: sat, text: `行運土星回到本命土星（${pos.saturn.sign.name} ${Math.floor(pos.saturn.sign.degree)}°）：${fmtAges(sat)}。` });
  const sat2 = findTransitAges('saturn', pos.saturn.lon, birth, 56, 62);
  list.push({ key: 'satReturn2', title: '第二次土星回歸', ages: sat2, text: `${fmtAges(sat2)}。` });
  const jup = [];
  for (const base of [12, 24, 36, 48, 60]) jup.push(...findTransitAges('jupiter', pos.jupiter.lon, birth, base - 1, base + 1));
  list.push({ key: 'jupReturn', title: '木星回歸（每 12 年）', ages: jup, text: `行運木星回到本命木星（${pos.jupiter.sign.name}）：${jup.map((x) => x.toFixed(1)).join('、') || '—'} 歲。` });
  const ura = findTransitAges('uranus', norm360(pos.uranus.lon + 180), birth, 36, 48);
  list.push({ key: 'uraOpp', title: '天王星對分（中年轉化）', ages: ura, text: `行運天王星對本命天王星（${pos.uranus.sign.name}）：${fmtAges(ura)}。` });
  const node = findTransitAges('northNode', pos.northNode.lon, birth, 17.5, 20);
  list.push({ key: 'nodeReturn', title: '北交點回歸', ages: node, text: `行運北交點回到本命北交點（${pos.northNode.sign.name}）：${fmtAges(node)}。` });
  return list;
}
