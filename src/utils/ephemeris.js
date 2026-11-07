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
    case 'northNode':
      return trueNodeLongitude(t);
    case 'southNode':
      return norm360(trueNodeLongitude(t) + 180);
    default: {
      const name = BODY_NAMES[id];
      if (!name) throw new Error(`未知天體：${id}`);
      const rot = Astronomy.Rotation_EQJ_ECT(t); // J2000 赤道 → 當日真黃道
      const v = Astronomy.RotateVector(rot, Astronomy.GeoVector(name, t, true));
      return norm360(Astronomy.SphereFromVector(v).lon);
    }
  }
}

/**
 * 真實月交點（升交點）：取月球軌道面法向量，於回歸黃道座標求交點方向。
 * 以前後各 0.05 日的月球位置向量求速度方向，與人類圖軟體慣用的真交點一致。
 */
function trueNodeLongitude(t) {
  const dt = 0.05;
  const rot = Astronomy.Rotation_EQJ_ECT(t);
  const vec = (tt) => Astronomy.RotateVector(rot, Astronomy.GeoMoon(tt));
  const a = vec(t.AddDays(-dt));
  const b = vec(t.AddDays(dt));
  const p = vec(t);
  // 角動量方向 h = r × v（v 以前後位置差近似）
  const vx = b.x - a.x, vy = b.y - a.y, vz = b.z - a.z;
  const hx = p.y * vz - p.z * vy;
  const hy = p.z * vx - p.x * vz;
  return norm360(deg(Math.atan2(hx, -hy)));
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

/**
 * 均時差（分鐘，視太陽時 − 平太陽時）。Spencer 級數，誤差約 ±30 秒。
 * @param {Date} date UTC 時刻
 */
export function equationOfTimeMinutes(date) {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const n = (date.getTime() - yearStart) / 86400000; // 0-based 年內日數（含小數）
  const B = (2 * Math.PI * n) / 365;
  return 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B)
    - 0.014615 * Math.cos(2 * B) - 0.040849 * Math.sin(2 * B));
}

/**
 * 真太陽時：由絕對 UTC 時刻與出生地經度推得（地方平時＋均時差）。
 * 回傳以「偽 UTC」表示的當地真太陽時，可用 getUTC* 讀取年月日時分。
 */
export function trueSolarFromUtc(utcDate, lon) {
  const eot = equationOfTimeMinutes(utcDate);
  const lmtOffset = lon * 4; // 相對 UTC 的地方平時差（分鐘）
  const solar = new Date(utcDate.getTime() + (lmtOffset + eot) * 60000);
  return { solar, eot, lmtOffset };
}

/** 真太陽時（顯示用）；tz 為出生當時與 UTC 的時差（小時） */
export function trueSolarTime({ year, month, day, hour = 12, minute = 0, lon, tz }) {
  const utc = localToUtcDate({ year, month, day, hour, minute, tz });
  const { solar, eot } = trueSolarFromUtc(utc, lon);
  const lmtOffset = (lon - tz * 15) * 4; // 相對標準時區中央經線的差（分鐘）
  const minutes = solar.getUTCHours() * 60 + solar.getUTCMinutes() + solar.getUTCSeconds() / 60;
  return { minutes, hour: solar.getUTCHours(), minute: solar.getUTCMinutes(), eot, lmtOffset, solar };
}
