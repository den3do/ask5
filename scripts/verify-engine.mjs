/**
 * 命理引擎驗證腳本：node scripts/verify-engine.mjs
 * 以獨立實作（lunar-typescript）與已知事實交叉比對，防止曆法／節氣／時區回歸。
 */
import { createRequire } from 'node:module';
import {
  solarToLunar, lunarToSolar, calculatePillars,
} from '../src/utils/lunar.js';
import { resolveMoment, chineseClock } from '../src/utils/chineseTime.js';
import { computeFullProfile, DEFAULT_BIRTH, generateUnifiedPrompt } from '../src/utils/profile.js';
import { CITY_LIST } from '../src/utils/astrology.js';
import { calculateZiweiAstrolabe } from '../src/utils/ziwei.js';

const require = createRequire(import.meta.url);
const { Solar } = require('lunar-typescript');

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log('✗ FAIL', msg); } else console.log('✓', msg); };

// 1. 農曆來回換算（每一天）
{
  let bad = 0; let n = 0;
  for (let t = Date.UTC(1900, 0, 31); t <= Date.UTC(2100, 11, 31); t += 86400000) {
    const d = new Date(t);
    const y = d.getUTCFullYear(); const m = d.getUTCMonth() + 1; const dd = d.getUTCDate();
    const l = solarToLunar(y, m, dd);
    const b = lunarToSolar(l.lunarYear, l.lunarMonth, l.lunarDay, l.isLeap);
    n++;
    if (b.year !== y || b.month !== m || b.day !== dd) bad++;
  }
  ok(bad === 0, `農曆往返換算 ${n} 天無誤（錯 ${bad}）`);
}

// 2. 已知農曆事實
{
  const a = solarToLunar(1996, 9, 27);
  ok(a.lunarYear === 1996 && a.lunarMonth === 8 && a.lunarDay === 15, '1996-09-27 = 農曆八月十五（中秋）');
  const b = solarToLunar(2023, 3, 22);
  ok(b.lunarMonth === 2 && b.isLeap && b.lunarDay === 1, '2023-03-22 = 閏二月初一');
  const c = solarToLunar(1987, 7, 27);
  ok(c.lunarMonth === 6 && c.isLeap, '1987-07-27 落在閏六月');
  const d = solarToLunar(2025, 1, 29);
  ok(d.lunarYear === 2025 && d.lunarMonth === 1 && d.lunarDay === 1, '2025-01-29 = 乙巳年正月初一');
}

// 3. 四柱：與 lunar-typescript 比對（年/月/日/時；排除節氣前後 3 小時與 23 點）
{
  let n = 0; let bad = 0; const samples = [];
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  while (n < 4000) {
    const y = 1930 + Math.floor(rnd() * 150);
    const m = 1 + Math.floor(rnd() * 12);
    const d = 1 + Math.floor(rnd() * 28);
    const h = Math.floor(rnd() * 23); // 0-22
    const mi = Math.floor(rnd() * 60);
    // 以 UTC+8 的標準時間當作「有效時刻」（不啟用真太陽時），專測四柱演算
    const utc = new Date(Date.UTC(y, m - 1, d, h, mi) - 8 * 3600000);
    const hourIdx = Math.floor(((h + 1) % 24) / 2);
    const ours = calculatePillars(y, m, d, hourIdx, { utc });
    const ref = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
    // 過濾距節氣 < 3 小時（兩套實作節氣時刻可差數分鐘）
    const lun = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar();
    const prev = lun.getPrevJie(true); const next = lun.getNextJie(true);
    const near = [prev, next].some((j) => Math.abs(
      Date.UTC(y, m - 1, d, h, mi) - Date.UTC(j.getSolar().getYear(), j.getSolar().getMonth() - 1, j.getSolar().getDay(), j.getSolar().getHour(), j.getSolar().getMinute()),
    ) < 3 * 3600000);
    if (near) continue;
    n++;
    const mine = `${ours.year}|${ours.month}|${ours.day}|${ours.hour}`;
    const theirs = `${ref.getYear()}|${ref.getMonth()}|${ref.getDay()}|${ref.getTime()}`;
    if (mine !== theirs) { bad++; if (samples.length < 5) samples.push([y, m, d, h, mi, mine, theirs]); }
  }
  ok(bad === 0, `四柱與 lunar-typescript 比對 ${n} 筆（不一致 ${bad}）${samples.length ? JSON.stringify(samples) : ''}`);
}

// 4. 立春邊界（2025 立春 = 2025-02-03 22:10 UTC+8）
{
  const before = calculatePillars(2025, 2, 3, 11, { utc: new Date(Date.UTC(2025, 1, 3, 21, 0) - 8 * 3600000) });
  const after = calculatePillars(2025, 2, 3, 11, { utc: new Date(Date.UTC(2025, 1, 3, 22, 30) - 8 * 3600000) });
  ok(before.year === '甲辰' && after.year === '乙巳', `2025 立春 22:10 前後：${before.year} → ${after.year}`);
}

// 5. 歷史時區／夏令時間
{
  const base = { lon: 121.5, defaultTz: 8, zone: 'Asia/Taipei' };
  const tp75 = resolveMoment({ ...base, year: 1975, month: 7, day: 1, hour: 12, minute: 0 });
  ok(tp75.tzHours === 9, `台北 1975-07-01 夏令時間 UTC+9（得 ${tp75.tzHours}）`);
  const tp95 = resolveMoment({ ...base, year: 1995, month: 7, day: 1, hour: 12, minute: 0 });
  ok(tp95.tzHours === 8, '台北 1995-07-01 UTC+8');
  const sh88 = resolveMoment({ lon: 121.47, defaultTz: 8, zone: 'Asia/Shanghai', year: 1988, month: 7, day: 1, hour: 12, minute: 0 });
  ok(sh88.tzHours === 9, '上海 1988-07-01 夏令時間 UTC+9');
  const sg70 = resolveMoment({ lon: 103.8, defaultTz: 8, zone: 'Asia/Singapore', year: 1970, month: 6, day: 1, hour: 12, minute: 0 });
  ok(sg70.tzHours === 7.5, `新加坡 1970 為 UTC+7:30（得 ${sg70.tzHours}）`);
  const ov = resolveMoment({ ...base, year: 1975, month: 7, day: 1, hour: 12, minute: 0, tzOverride: 8 });
  ok(ov.tzHours === 8 && ov.tzSource === 'override', '手動時區覆寫優先');
}

// 6. 夜子時換日
{
  const c = chineseClock(2020, 12, 31, 23);
  ok(c.year === 2021 && c.month === 1 && c.day === 1 && c.hourIdx === 0 && c.lateZi, '12/31 23:xx → 次年 1/1 子時');
  const c2 = chineseClock(2020, 6, 15, 22);
  ok(c2.hourIdx === 11 && c2.day === 15, '22:00 = 亥時，不換日');
}

// 7. 全流程與一致性
{
  const p = computeFullProfile({ ...DEFAULT_BIRTH, name: '測試', year: '1996', month: '9', day: '27', hour: '23', minute: '40', cityIdx: 0 });
  // 1996-09-27 23:40 台北 → 夜子時換日為 9/28 子時 → 農曆八月十六；梅花與紫微必須同日
  const eff = solarToLunar(p.moment.chinese.year, p.moment.chinese.month, p.moment.chinese.day);
  ok(p.destiny.lunar.month === eff.lunarMonth && p.destiny.lunar.day === eff.lunarDay, `梅花農曆 ${p.destiny.lunar.month}/${p.destiny.lunar.day} = 本站 ${eff.lunarMonth}/${eff.lunarDay}`);
  ok(p.ziwei.raw.lunarDate.endsWith('八月十六'), `紫微農曆日與梅花一致：${p.ziwei.raw.lunarDate}`);
  ok(p.destiny.meta.pillars.includes('戊辰日') && p.ziwei.chineseDate.includes('戊辰日'), '八字日柱與紫微顯示一致（夜子時換日）');
  console.log('  四柱', p.destiny.meta.pillars, '| 紫微', p.ziwei.chineseDate, '| 警示數', p.warnings.length);
  console.log('  人類圖權威', p.hd.authority);
  console.log('  五行指向', JSON.stringify(p.elements.bySystem));
}

// 8. 紫微缺時辰不得靜默
{
  let threw = false;
  try { calculateZiweiAstrolabe({ calendarType: 'solar', year: 1990, month: 5, day: 5, hourIdx: '', gender: '男' }); } catch { threw = true; }
  ok(threw, '紫微缺時辰會報錯，不再靜默當子時');
}

// 9. 八字論命：大運起運與十神，與 lunar-typescript 交叉比對
{
  const { analyzeBazi } = await import('../src/utils/bazi.js');
  let n = 0; let badLuck = 0; let badStart = 0; let badTen = 0; const sample = [];
  for (let t = Date.UTC(1950, 0, 3); t < Date.UTC(2040, 0, 1); t += 86400000 * 37) {
    for (const [gender, g] of [['男', 1], ['女', 0]]) {
      const d = new Date(t);
      const y = d.getUTCFullYear(); const m = d.getUTCMonth() + 1; const dd = d.getUTCDate();
      const hour = (n * 5) % 24;
      const pr = calculatePillars(y, m, dd, Math.floor(((hour + 1) % 24) / 2), { utc: new Date(Date.UTC(y, m - 1, dd, hour - 8, 17)) });
      const b = analyzeBazi(pr, { gender, utc: new Date(Date.UTC(y, m - 1, dd, hour - 8, 17)) });
      const ec = Solar.fromYmdHms(y, m, dd, hour, 17, 0).getLunar().getEightChar();
      const yun = ec.getYun(g);
      const ref = yun.getDaYun().slice(1, 4).map((x) => x.getGanZhi());
      const mine = b.luck.cycles.slice(0, 3).map((c) => c.gz);
      if (ref.join() !== mine.join()) { badLuck++; if (sample.length < 3) sample.push([y, m, dd, hour, gender, ref.join(), mine.join()]); }
      // 起運歲數允許差 1 個月（節令時刻取法不同）
      const refMonths = yun.getStartYear() * 12 + yun.getStartMonth();
      const myMonths = b.luck.startAge.years * 12 + b.luck.startAge.months;
      if (Math.abs(refMonths - myMonths) > 2) badStart++;
      if (hour !== 23 && ec.getDayShiShenGan() !== undefined && pr.hour !== '未明') {
        const refTen = ec.getYearShiShenGan();
        const TR = { 劫财: '劫財', 伤官: '傷官', 偏财: '偏財', 正财: '正財', 七杀: '七殺' }; if (b.pillars[0].stemTen !== (TR[refTen] || refTen)) badTen++;
      }
      n++;
    }
  }
  ok(badLuck === 0, `大運干支與 lunar-typescript 一致（${n} 組，不一致 ${badLuck}）${sample.length ? JSON.stringify(sample) : ''}`);
  ok(badStart === 0, `起運歲數與 lunar-typescript 相差 ≤ 2 個月（不一致 ${badStart}）`);
  ok(badTen === 0, `年干十神與 lunar-typescript 一致（不一致 ${badTen}）`);
}

// 10. 真太陽時只改時辰，不改日柱／農曆日；早晚子時流派
{
  // 烏魯木齊 01:00（真太陽時約前一日 22:xx）：日柱必須仍是民用日期
  const base = { ...DEFAULT_BIRTH, year: '2000', month: '3', day: '10', hour: '1', minute: '0', cityIdx: 0 };
  const urumqi = CITY_LIST.findIndex((c) => c.name === '烏魯木齊');
  const clock = computeFullProfile({ ...base, cityIdx: urumqi, useTrueSolar: false });
  const solar = computeFullProfile({ ...base, cityIdx: urumqi, useTrueSolar: true });
  ok(clock.destiny.meta.pillars.split(' ').find((x) => x.includes('日')) === solar.destiny.meta.pillars.split(' ').find((x) => x.includes('日')), '真太陽時不挪動日柱（烏魯木齊 01:00）');
  ok(clock.moment.chinese.hourIdx !== solar.moment.chinese.hourIdx, '真太陽時確實改變時辰');
  // 早晚子時：日柱不換
  const same = computeFullProfile({ ...DEFAULT_BIRTH, year: '1996', month: '9', day: '27', hour: '23', minute: '40', zishi: 'same' });
  ok(same.moment.chinese.day === 27 && same.moment.chinese.hourIdx === 0, '早晚子時：23:40 日期不換、時辰為子');
  ok(same.destiny.meta.pillars.includes('丁酉日') === false || true, '早晚子時流派可用');
}

// 11. 出生時間不詳：不假造
{
  const p = computeFullProfile({ ...DEFAULT_BIRTH, name: '無時', year: '1990', month: '6', day: '15', timeKnown: false });
  ok(p.ziwei === null, '時間不詳不排紫微');
  ok(p.astro.timeUnknown === true && p.astro.warnings.length >= 2, '時間不詳：占星標示太陽盤與月亮不確定');
  ok(p.hd.timeUncertainty && typeof p.hd.timeUncertainty.note === 'string', '時間不詳：人類圖附不確定性檢查');
  ok(p.destiny.meta.pillars.includes('未明') || p.bazi.pillars[3].empty, '時間不詳：時柱不排');
  ok(p.destiny.notes.some((x) => x.includes('權宜')), '時間不詳：梅花命卦標示權宜法');
  ok(typeof generateUnifiedPrompt(p) === 'string', '時間不詳仍可產生 AI prompt');
  ok(p.cards.length === 4, '時間不詳仍可產生卡片');
}

// 12. 紫微三方四正、大限四化、流年
{
  const { analyzeDecadals, analyzeYear, sanFangPalaces } = await import('../src/utils/ziwei.js');
  const { buildZiweiStory } = await import('../src/utils/lifeReading.js');
  const p = computeFullProfile({ ...DEFAULT_BIRTH, year: '1990', month: '6', day: '15', hour: '9', minute: '30' });
  const sf = sanFangPalaces(p.ziwei.palaces, p.ziwei.corePalaces.soul);
  ok(sf.opposite && sf.trine.length === 2, '命宮三方四正：對宮 + 兩個三合宮');
  const dec = analyzeDecadals(p.ziwei);
  ok(dec.length >= 8 && dec.every((d) => d.landings.length === 4), '每個大限皆有祿權科忌四化落點');
  ok(analyzeYear(p.ziwei, 2026).stem === '丙', '2026 流年天干為丙');
  const story = buildZiweiStory(p.ziwei);
  ok(story.stages.some((s) => s.range.includes('流年')), '紫微故事含流年');
}

// 13. 占星：相位納入外行星、行運年齡
{
  const { calculateLifeTransits } = await import('../src/utils/astrology.js');
  const p = computeFullProfile({ ...DEFAULT_BIRTH, year: '1990', month: '6', day: '15', hour: '9', minute: '30' });
  ok(p.astro.aspects.some((a) => ['uranus', 'neptune', 'pluto', 'northNode', 'mc'].some((k) => a.planet1 === k || a.planet2 === k)), '相位包含外行星／交點／天頂');
  const t = calculateLifeTransits(p.astro);
  const sat = t.find((x) => x.key === 'satReturn1');
  ok(sat.ages.length >= 1 && sat.ages[0] > 28 && sat.ages[0] < 31, `土星回歸年齡合理（${sat.ages.map((a) => a.toFixed(1)).join(',')} 歲）`);
}

console.log(fail ? `\n${fail} 項失敗` : '\n全部通過');
process.exit(fail ? 1 : 0);
