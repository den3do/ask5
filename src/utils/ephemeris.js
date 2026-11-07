/**
 * 星曆底層：以 astronomy-engine（VSOP87 / 月球級數，精度約角秒級）計算
 * 黃道（回歸黃道、當日分點）上的日月行星經度、月交點、上升點與天頂。
 * 西洋占星與人類圖共用。
 */
import * as Astronomy from 'astronomy-engine';

export const norm360 = (a) => ((a % 360) + 360) % 360;
/** 規範化到 -180 ~ 180 */
export const norm180 = (a) => ((a + 540) % 360) - 180;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

const BODY_NAMES = {
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
};

/** 出生地當地時間 → UTC Date（tz 為與 UTC 的小時差，可含小數） */
export function localToUtcDate({ year, month, day, hour = 12, minute = 0, tz = 8 }) {
  const ms = Date.UTC(year, month - 1, day, 0, 0, 0) + (hour * 60 + minute - tz * 60) * 60000;
  return new Date(ms);
}

/** 以 Date 取得天文時間物件 */
const toTime = (date) => Astronomy.MakeTime(date);

/**
 * 回歸黃道經度（0~360）。
 * id: sun | moon | mercury … pluto | northNode(平均交點) | southNode | earth
 */
export function bodyLongitude(id, date) {
  const t = toTime(date);
  switch (id) {
    case 'sun':
      return norm360(Astronomy.SunPosition(t).elon);
    case 'earth':
      return norm360(Astronomy.SunPosition(t).elon + 180);
    case 'moon':
      return norm360(Astronomy.EclipticGeoMoon(t).lon);
    case 'northNode': {
      const T = t.tt / 36525;
      return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T);
    }
    case 'southNode': {
      const T = t.tt / 36525;
      return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + 180);
    }
    default: {
      const name = BODY_NAMES[id];
      if (!name) throw new Error(`未知天體：${id}`);
      const rot = Astronomy.Rotation_EQJ_ECT(t); // J2000 赤道 → 當日真黃道
      const v = Astronomy.RotateVector(rot, Astronomy.GeoVector(name, t, true));
      return norm360(Astronomy.SphereFromVector(v).lon);
    }
  }
}

/** 太陽每日平均移動速度，供回溯求解使用 */
export const SUN_DEG_PER_DAY = 0.9856;

/**
 * 求出太陽黃經等於 targetLon 的時刻（以 guess 為起點迭代）
 */
export function findSunLongitudeTime(targetLon, guessDate) {
  let ms = guessDate.getTime();
  for (let i = 0; i < 12; i++) {
    const cur = bodyLongitude('sun', new Date(ms));
    const diff = norm180(targetLon - cur);
    ms += (diff / SUN_DEG_PER_DAY) * 86400000;
    if (Math.abs(diff) < 1e-6) break;
  }
  return new Date(ms);
}

/**
 * 上升點與天頂（回歸黃道，真黃赤交角）
 * @param {Date} date UTC 時刻
 * @param {number} lat 緯度（北正）
 * @param {number} lon 經度（東正）
 */
export function ascendantAndMc(date, lat, lon) {
  const t = toTime(date);
  const gast = Astronomy.SiderealTime(t); // 小時
  const ramc = norm360(gast * 15 + lon);
  const eps = Astronomy.e_tilt(t).tobl;
  const R = rad(ramc);
  const E = rad(eps);
  const mc = norm360(deg(Math.atan2(Math.sin(R), Math.cos(R) * Math.cos(E))));
  const y = Math.cos(R);
  const x = -(Math.sin(R) * Math.cos(E) + Math.tan(rad(lat)) * Math.sin(E));
  let asc = norm360(deg(Math.atan2(y, x)));
  // 確保上升點在天頂東側（黃經大於 MC 約 0~180°）
  if (norm360(asc - mc) > 180) asc = norm360(asc + 180);
  return { asc, mc, ramc, eps };
}

/** 真太陽時（小時，0~24）：地方平時加均時差 */
export function trueSolarTime({ year, month, day, hour = 12, minute = 0, lon, tz }) {
  const start = Date.UTC(year, 0, 0);
  const n = Math.floor((Date.UTC(year, month - 1, day) - start) / 86400000);
  const B = rad((360 / 365) * (n - 81));
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // 分鐘
  const lmtOffset = (lon - tz * 15) * 4; // 分鐘
  let minutes = hour * 60 + minute + lmtOffset + eot;
  minutes = ((minutes % 1440) + 1440) % 1440;
  return { minutes, hour: Math.floor(minutes / 60), minute: Math.round(minutes % 60), eot, lmtOffset };
}
