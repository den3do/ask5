/**
 * 出生時刻驗證：node scripts/verify-time.mjs
 * 夜子時流派（早晚子時的時干）、真太陽時跨午夜、時間不詳的交節提醒、表單夜子時提示文字。
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { calculatePillars } from '../src/utils/lunar.js';
import { chineseClock, resolveMoment, lateZiHint, solarCrossHint } from '../src/utils/chineseTime.js';
import { computeFullProfile, DEFAULT_BIRTH } from '../src/utils/profile.js';

const require = createRequire(import.meta.url);
const { Solar } = require('lunar-typescript');

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('✗ FAIL', m); } else console.log('✓', m); };

const pillarsOf = (c, utc) => calculatePillars(c.year, c.month, c.day, c.hourIdx, { utc, hourStemDayShift: c.hourStemDayShift });
const moment = (o) => resolveMoment({ minute: 0, zone: 'Asia/Shanghai', defaultTz: 8, lon: 120, useTrueSolar: false, zishi: 'next', ...o });

// 1. 表單夜子時提示依流派
{
  ok(lateZiHint('next').includes('晚子時算次日') && lateZiHint('next').includes('次日子時'), '夜子時提示（晚子時算次日）');
  const same = lateZiHint('same');
  ok(same.includes('早晚子時') && same.includes('日柱與農曆日仍以當日計') && !same.includes('以次日子時排盤'), '夜子時提示（早晚子時）不再寫「以次日子時排盤」');
  ok(lateZiHint('next', true).startsWith('真太陽時'), '採真太陽時時，提示註明以真太陽時判斷');
  const form = readFileSync(new URL('../src/components/BirthForm.jsx', import.meta.url), 'utf8');
  ok(form.includes('夜子時（23:00–23:59）') && !form.includes('23:00–00:59'), '表單夜子時標籤為 23:00–23:59（與程式只把 23 點視為夜子時一致）');
}

// 2. 早晚子時：日柱不換，晚子時時干依次日五鼠遁
{
  const late = chineseClock(2000, 1, 1, 23, 'same');
  ok(late.day === 1 && late.hourIdx === 0 && late.hourStemDayShift === 1, '早晚子時 23:xx：日期不換、子時、hourStemDayShift = 1');
  const pl = pillarsOf(late);
  ok(pl.day === '戊午' && pl.hour === '甲子', `戊午日 23:30（早晚子時）→ 戊午日 甲子時（得 ${pl.day}日 ${pl.hour}時）`);
  const early = pillarsOf(chineseClock(2000, 1, 1, 0, 'same'));
  ok(early.day === '戊午' && early.hour === '壬子', `戊午日 00:30 → 壬子時（得 ${early.hour}）`);
  const next = pillarsOf(chineseClock(2000, 1, 1, 23, 'next'));
  ok(next.day === '己未' && next.hour === '甲子', `晚子時算次日不變：2000/1/1 23:30 → 己未日 甲子時（得 ${next.day} ${next.hour}）`);
  ok(chineseClock(2000, 1, 1, 23, 'next').hourStemDayShift === 0, '晚子時算次日：hourStemDayShift = 0');

  // 與 lunar-typescript 交叉比對（sect 2 = 晚子時日柱算當天）
  let bad = 0; let n = 0; const samples = [];
  for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2050, 0, 1); t += 86400000 * 97) {
    const d = new Date(t);
    const y = d.getUTCFullYear(); const mo = d.getUTCMonth() + 1; const dd = d.getUTCDate();
    const m = moment({ year: y, month: mo, day: dd, hour: 23, minute: 30, zone: 'Asia/Taipei', lon: 121.5, zishi: 'same' });
    const p = pillarsOf(m.chinese, m.utc);
    const ec = Solar.fromYmdHms(y, mo, dd, 23, 30, 0).getLunar().getEightChar();
    ec.setSect(2);
    if (p.day !== ec.getDay() || p.hour !== ec.getTime()) { bad++; if (samples.length < 3) samples.push([y, mo, dd, p.day, p.hour, ec.getDay(), ec.getTime()]); }
    n++;
  }
  ok(bad === 0, `早晚子時 23:30 日柱／時柱與 lunar-typescript（sect 2）一致（${n} 筆，不一致 ${bad}）${samples.length ? JSON.stringify(samples) : ''}`);

  // 鐘錶時間＋晚子時算次日：與舊行為完全相同（日期、時辰、時干不位移）
  let diff = 0;
  for (let h = 0; h < 24; h++) {
    const m = moment({ year: 2020, month: 12, day: 31, hour: h });
    const old = chineseClock(2020, 12, 31, h);
    if (m.chinese.year !== old.year || m.chinese.month !== old.month || m.chinese.day !== old.day || m.chinese.hourIdx !== old.hourIdx || m.chinese.hourStemDayShift !== 0) diff++;
  }
  ok(diff === 0, '鐘錶時間＋晚子時算次日：24 個整點的有效日期與時辰與 chineseClock 相同');
}

// 3. 真太陽時跨午夜：日柱仍為民用日期，時柱取該時辰實際的干支
{
  // 成都 1990/6/1 00:30（夏令時間 UTC+9）→ 真太陽時約 5/31 22:28
  const m = moment({ year: 1990, month: 6, day: 1, hour: 0, minute: 30, lon: 104.0668, useTrueSolar: true });
  const s = m.trueSolar;
  ok(m.tzHours === 9 && s.month === 5 && s.day === 31 && s.hour === 22 && Math.abs(s.minute - 28) <= 1, `成都 1990/6/1 00:30 真太陽時 ${s.month}/${s.day} ${s.hour}:${s.minute}`);
  ok(m.solarDayShift === -1, '真太陽時退回前一天：solarDayShift = −1');
  const c = m.chinese;
  ok(c.year === 1990 && c.month === 6 && c.day === 1 && c.hourIdx === 11 && c.hourStemDayShift === -1, '日期仍為民用 6/1、時辰亥、時干依前一天（hourStemDayShift = −1）');
  const p = pillarsOf(c, m.utc);
  const civil = calculatePillars(1990, 6, 1, 0, { utc: m.utc });
  const prevHai = calculatePillars(1990, 5, 31, 11);
  const wrongHai = calculatePillars(1990, 6, 1, 11);
  ok(p.day === civil.day, `日柱仍為民用日期 6/1（${p.day}）`);
  ok(p.hour === prevHai.hour && p.hour !== wrongHai.hour, `時柱 = 5/31 亥時 ${prevHai.hour}，不是 6/1 深夜的亥時 ${wrongHai.hour}（得 ${p.hour}）`);
  const ref = Solar.fromYmdHms(1990, 5, 31, 22, 28, 0).getLunar().getTimeInGanZhi();
  ok(p.hour === ref, `時柱與 lunar-typescript 5/31 22:28 一致（${ref}）`);
  ok((solarCrossHint(m) || '').includes('跨過午夜'), '表單提示真太陽時跨過午夜');
  ok(solarCrossHint(moment({ year: 1990, month: 6, day: 1, hour: 12, lon: 104.0668, useTrueSolar: true })) === null, '未跨午夜不提示');

  // 真太陽時 23:xx（鐘錶 22:50，東邊經度 128°、11 月均時差約 +16 分）：夜子時以真太陽時判斷
  const nx = moment({ year: 2000, month: 11, day: 3, hour: 22, minute: 50, lon: 128, useTrueSolar: true });
  ok(nx.trueSolar.hour === 23 && nx.chinese.lateZi && nx.chinese.day === 4 && nx.chinese.hourIdx === 0 && nx.chinese.hourStemDayShift === 0,
    `真太陽時 ${nx.trueSolar.hour}:${nx.trueSolar.minute}＋晚子時算次日 → 11/4 子時（得 ${nx.chinese.month}/${nx.chinese.day} idx ${nx.chinese.hourIdx}）`);
  const sm = moment({ year: 2000, month: 11, day: 3, hour: 22, minute: 50, lon: 128, useTrueSolar: true, zishi: 'same' });
  ok(sm.chinese.day === 3 && sm.chinese.hourIdx === 0 && sm.chinese.hourStemDayShift === 1, '真太陽時 23:xx＋早晚子時 → 11/3 晚子時（時干依次日）');
  ok(pillarsOf(sm.chinese, sm.utc).hour === pillarsOf(nx.chinese, nx.utc).hour, '兩派晚子時的時柱相同，只差日柱');

  // 鐘錶 23:50 → 真太陽時次日 00:3x
  const fwdN = moment({ year: 2000, month: 11, day: 3, hour: 23, minute: 50, lon: 128, useTrueSolar: true });
  ok(fwdN.solarDayShift === 1 && fwdN.chinese.day === 4 && fwdN.chinese.hourIdx === 0 && fwdN.chinese.hourStemDayShift === 0, '真太陽時過午夜＋晚子時算次日 → 11/4 子時');
  const fwdS = moment({ year: 2000, month: 11, day: 3, hour: 23, minute: 50, lon: 128, useTrueSolar: true, zishi: 'same' });
  ok(fwdS.chinese.day === 3 && fwdS.chinese.hourIdx === 0 && fwdS.chinese.hourStemDayShift === 1 && fwdS.chinese.lateZi, '真太陽時過午夜＋早晚子時 → 11/3 晚子時');

  // 鐘錶 01:20 → 真太陽時前一天 23:xx（成都夏令）：兩派都是 6/1 子時、時干依 6/1
  for (const zishi of ['next', 'same']) {
    const b = moment({ year: 1990, month: 6, day: 1, hour: 1, minute: 20, lon: 104.0668, useTrueSolar: true, zishi });
    ok(b.trueSolar.day === 31 && b.trueSolar.hour === 23 && b.chinese.day === 1 && b.chinese.hourIdx === 0 && b.chinese.hourStemDayShift === 0,
      `真太陽時前一天 23:${b.trueSolar.minute}（${zishi}）→ 6/1 子時、時干不位移`);
  }

  // 既有約定：烏魯木齊 01:00 真太陽時跨回前一天，日柱不挪
  const u = moment({ year: 2000, month: 3, day: 10, hour: 1, lon: 87.6, useTrueSolar: true });
  ok(u.chinese.day === 10 && u.chinese.hourIdx === 11 && u.chinese.hourStemDayShift === -1, '烏魯木齊 2000/3/10 01:00：日期 3/10、亥時、時干依 3/9');
}

// 5. 時間不詳的交節提醒：不得寫成「出生時刻距…」
{
  const noon = new Date(Date.UTC(2025, 1, 3, 4)); // 2025/2/3 12:00 台北；立春 2/3 22:10
  const p = calculatePillars(2025, 2, 3, null, { utc: noon });
  ok(p.nearJie && p.termWarning.startsWith('出生時間不詳') && p.termWarning.includes('當日中午') && !p.termWarning.includes('出生時刻距'), `時間不詳交節提醒：${p.termWarning}`);
  const h = calculatePillars(2025, 2, 3, 10, { utc: new Date(Date.UTC(2025, 1, 3, 12)) });
  ok(h.nearJie && h.termWarning.startsWith('出生時刻距「立春」'), '有時辰時仍寫「出生時刻距…」');
  const prof = computeFullProfile({ ...DEFAULT_BIRTH, year: '2025', month: '2', day: '3', timeKnown: false });
  ok(prof.warnings.some((w) => w.startsWith('出生時間不詳：以當日中午估算')) && !prof.warnings.some((w) => w.startsWith('出生時刻距')), '個人命理（時間不詳）提醒改為以中午估算');
}

// 端到端：destiny／唯心宗是否已把 hourStemDayShift 傳給 calculatePillars（需 destiny.js、weixin.js 接線）
{
  const p = computeFullProfile({ ...DEFAULT_BIRTH, year: '2000', month: '1', day: '1', hour: '23', minute: '30', zishi: 'same' });
  const hour = p.destiny.pillarsRaw.hour;
  console.log(`  · 端到端（早晚子時 2000/1/1 23:30）四柱時柱：${hour}${hour === '甲子' ? '（已接線）' : '（尚未接線，應為甲子）'}`);
}

console.log(fail ? `\n${fail} 項失敗` : '\n全部通過');
process.exit(fail ? 1 : 0);
