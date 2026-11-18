/**
 * 出生時刻解析：歷史時區／夏令時間（IANA）→ 絕對 UTC → 真太陽時 → 時辰與夜子時換日
 *
 * 所有命理系統（六爻梅花、八字、紫微、占星、人類圖）共用同一個「出生時刻」，
 * 避免各系統各自換算造成日期或時辰不一致。
 *
 * 約定（會寫入報告的 conventions）：
 *   1. 絕對時刻 = 出生地當時的法定時間，依 IANA 時區資料庫換算（含台灣 1946-1979、
 *      中國 1986-1991、日本 1948-1951、新加坡 1982 前 UTC+7:30 等歷史變更）。
 *   2. 中式命理（八字、六爻、梅花、紫微）的時辰預設採「鐘錶時間」（台灣主流排法）；可選真太陽時。
 *      真太陽時只改變「時辰」，日柱與農曆日一律錨定在出生當地的民用日期（夜子時除外）。
 *      若真太陽時跨過午夜（例如鐘錶 00:30 → 真太陽時前一天 22:28），日柱仍取民用日期，
 *      但時柱取「那個時辰實際的干支」（依真太陽時當天的五鼠遁），不會把前一晚的亥時誤當成當天深夜的亥時。
 *   3. 夜子時（23:00–23:59）：預設「晚子時算次日」（日柱、農曆日、時辰皆為次日子時）；
 *      可選「早晚子時」流派（zishi = 'same'：日柱不換，仍以當日計；時干依次日五鼠遁，即晚子時）。
 *   時干與日柱的對應以 chinese.hourStemDayShift 表示：時干改用「日柱日期 + shift 天」的五鼠遁
 *   （早晚子時的晚子時 = +1；真太陽時退回前一天 = −1），請把它傳給 calculatePillars(..., { hourStemDayShift })。
 *   4. 年柱、月柱以絕對時刻對照真實節氣；占星、人類圖直接用絕對 UTC，不受 2、3 影響。
 */
import { localToUtcDate, trueSolarFromUtc } from './ephemeris.js';

const fmtCache = new Map();
function getFormatter(zone) {
  if (fmtCache.has(zone)) return fmtCache.get(zone);
  let f = null;
  try {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
  } catch { f = null; }
  fmtCache.set(zone, f);
  return f;
}

/** 某 UTC 時刻在指定 IANA 時區的偏移（分鐘）；時區不可用時回傳 null */
export function zoneOffsetMinutesAt(zone, utcMs) {
  const f = zone ? getFormatter(zone) : null;
  if (!f) return null;
  const p = {};
  for (const part of f.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asUtc - Math.floor(utcMs / 1000) * 1000) / 60000;
}

/** 地方法定時間 → UTC 毫秒（含歷史時區與夏令時間） */
export function localToUtcMsInZone(zone, y, mo, d, h, mi) {
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const off1 = zoneOffsetMinutesAt(zone, asUtc);
  if (off1 === null) return null;
  let utc = asUtc - off1 * 60000;
  const off2 = zoneOffsetMinutesAt(zone, utc);
  if (off2 !== off1) utc = asUtc - off2 * 60000;
  return { utcMs: utc, offsetMin: zoneOffsetMinutesAt(zone, utc) };
}

const DAY_MS = 86400000;
const dayNumber = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
const fromDayNumber = (n) => {
  const t = new Date(n * DAY_MS);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};

/**
 * 夜子時換日：回傳有效日期與時辰索引（子=0 … 亥=11）
 *  - 'next'（晚子時算次日）：23:00 後日期換到次日、時辰為次日子時
 *  - 'same'（早晚子時）：日期不換；時辰為子，但時干依次日五鼠遁（hourStemDayShift = 1）
 */
export function chineseClock(year, month, day, hour, school = 'next') {
  const h = ((parseInt(hour, 10) % 24) + 24) % 24;
  const lateZi = h >= 23;
  let { y, m, d } = { y: year, m: month, d: day };
  if (lateZi && school !== 'same') {
    const t = new Date(Date.UTC(year, month - 1, day + 1));
    y = t.getUTCFullYear(); m = t.getUTCMonth() + 1; d = t.getUTCDate();
  }
  const hourIdx = lateZi ? 0 : Math.floor(((h + 1) % 24) / 2);
  const hourStemDayShift = lateZi && school === 'same' ? 1 : 0;
  return { year: y, month: m, day: d, hourIdx, lateZi, school, hourStemDayShift };
}

/** 表單上的夜子時提示文字（依流派；useTrueSolar 時註明以真太陽時判斷） */
export function lateZiHint(school, useTrueSolar = false) {
  const when = useTrueSolar ? '真太陽時 23:00 後' : '23:00 後';
  return school === 'same'
    ? `${when}為夜子時：目前採「早晚子時」，日柱與農曆日仍以當日計，時柱依次日五鼠遁（晚子時干支）。`
    : `${when}為夜子時：目前採「晚子時算次日」，日柱、農曆日與時辰皆以次日子時排盤。`;
}

/** 真太陽時跨過午夜時的提示文字；未跨日或未採真太陽時回傳 null */
export function solarCrossHint(m) {
  if (!m?.useTrueSolar || !m.solarDayShift) return null;
  const s = m.trueSolar;
  const pad = (n) => String(n).padStart(2, '0');
  const side = m.solarDayShift < 0 ? '前一天' : '次日';
  const c = m.chinese;
  const stem = c.hourStemDayShift && !(c.lateZi && m.school === 'same')
    ? `；時柱取該時辰實際的干支（依${c.hourStemDayShift < 0 ? '前一天' : '次日'}的五鼠遁）`
    : '';
  return `真太陽時跨過午夜，落在${side} ${s.month}/${s.day} ${pad(s.hour)}:${pad(s.minute)}：日柱與農曆日依本站約定仍以 ${c.month}/${c.day} 計${stem}。`;
}

/**
 * @param {Object} p
 * @param {number} p.year,month,day,hour,minute  出生地當地法定時間
 * @param {number} p.lon                          出生地經度
 * @param {string} [p.zone]                       IANA 時區，如 'Asia/Taipei'
 * @param {number} p.defaultTz                    現行標準時區（時差小時）
 * @param {number|null} [p.tzOverride]            使用者手動指定的時差（小時），優先於 IANA
 * @param {boolean} [p.useTrueSolar=false]        中式時辰是否採真太陽時（預設鐘錶時間）
 * @param {'next'|'same'} [p.zishi='next']        夜子時流派
 */
export function resolveMoment(p) {
  const { year, month, day, hour = 12, minute = 0, lon, zone, defaultTz } = p;
  const useTrueSolar = p.useTrueSolar === true || p.useTrueSolar === 'true';
  const school = p.zishi === 'same' ? 'same' : 'next';
  const hasOverride = p.tzOverride !== null && p.tzOverride !== undefined && p.tzOverride !== '' && !Number.isNaN(Number(p.tzOverride));

  let utcMs; let offsetMin; let tzSource;
  if (hasOverride) {
    offsetMin = Number(p.tzOverride) * 60;
    utcMs = Date.UTC(year, month - 1, day, hour, minute) - offsetMin * 60000;
    tzSource = 'override';
  } else {
    const r = localToUtcMsInZone(zone, year, month, day, hour, minute);
    if (r) {
      utcMs = r.utcMs; offsetMin = r.offsetMin; tzSource = 'iana';
    } else {
      offsetMin = defaultTz * 60;
      utcMs = localToUtcDate({ year, month, day, hour, minute, tz: defaultTz }).getTime();
      tzSource = 'default';
    }
  }
  const utc = new Date(utcMs);
  const tzHours = offsetMin / 60;

  const { solar, eot, lmtOffset } = trueSolarFromUtc(utc, lon);
  const solarParts = { year: solar.getUTCFullYear(), month: solar.getUTCMonth() + 1, day: solar.getUTCDate(), hour: solar.getUTCHours(), minute: solar.getUTCMinutes() };
  const basis = useTrueSolar ? solarParts : { year, month, day, hour, minute };
  const sc = chineseClock(basis.year, basis.month, basis.day, basis.hour, school);
  // 日期錨定在鐘錶（民用）日期：真太陽時只改時辰，不把日柱／農曆日整天挪走。
  // 僅「晚子時算次日」的子時可換到次日（是否為夜子時以 basis 判斷，真太陽時即以真太陽時判斷）。
  const civilDay = dayNumber(year, month, day);
  const solarDayShift = dayNumber(basis.year, basis.month, basis.day) - civilDay; // 真太陽時跨午夜：−1／0／+1
  const effDay = dayNumber(sc.year, sc.month, sc.day);
  const stemDay = effDay + sc.hourStemDayShift; // 這個時辰實際所屬（五鼠遁）的那一天
  const pillarDay = school === 'next' && sc.hourIdx === 0 && effDay === civilDay + 1 ? civilDay + 1 : civilDay;
  const chinese = {
    ...sc,
    ...fromDayNumber(pillarDay),
    // 鐘錶 23:xx、真太陽時已過午夜的子時，對民用日期而言也是夜子時
    lateZi: sc.lateZi || (sc.hourIdx === 0 && effDay === civilDay + 1),
    // 真太陽時退回前一天的亥時 → −1：時柱用前一天的五鼠遁，而不是當天深夜的亥時
    hourStemDayShift: stemDay - pillarDay,
  };

  let tzNote = null;
  if (tzSource === 'iana' && Math.abs(tzHours - defaultTz) > 1e-6) {
    const fmt = (v) => `UTC${v >= 0 ? '+' : '-'}${Math.floor(Math.abs(v))}${Math.abs(v) % 1 ? `:${String(Math.round((Math.abs(v) % 1) * 60)).padStart(2, '0')}` : ''}`;
    tzNote = `該日當地實際採用 ${fmt(tzHours)}（現行為 ${fmt(defaultTz)}），已依歷史時區／夏令時間換算。`;
  }

  return {
    utc, tzHours, tzSource, tzNote, useTrueSolar, school,
    solarDayShift: useTrueSolar ? solarDayShift : 0,
    trueSolar: { ...solarParts, eot, lmtOffset: lmtOffset - tzHours * 60 },
    chinese, // { year, month, day, hourIdx, lateZi, hourStemDayShift }：中式命理共用的有效日期與時辰
  };
}
