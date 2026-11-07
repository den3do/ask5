/**
 * 論命層驗證：node scripts/verify-reading.mjs
 * 驗證運限換界、八字強弱／調候／刑沖合害、六爻用神（伏神、多現、性別）、八字合婚等「論斷邏輯」，
 * 補足 verify-engine.mjs 只驗曆法排盤的缺口。
 */
import { lunarYearOf, baziYearOf, calculatePillars } from '../src/utils/lunar.js';
import { analyzeBazi, compareBazi } from '../src/utils/bazi.js';
import { calculateZiweiAstrolabe, analyzeDecadals } from '../src/utils/ziwei.js';
import { evaluateDivination, getTopicYongShen } from '../src/utils/iching.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('✗ FAIL', m); } else console.log('✓', m); };
const d = (s) => new Date(s);

// 1. 換年界：春節（農曆年）≠ 立春（八字年）
ok(lunarYearOf(d('2027-01-15T04:00:00Z')) === 2026, '2027-01-15 仍是農曆 2026 年（春節 2027-02-06）');
ok(lunarYearOf(d('2027-02-06T04:00:00Z')) === 2027, '2027-02-06 起為農曆 2027 年');
ok(baziYearOf(d('2027-01-15T04:00:00Z')) === 2026, '2027-01-15 八字年仍為 2026（立春前）');
ok(baziYearOf(d('2027-02-05T04:00:00Z')) === 2027, '2027-02-05 八字年為 2027（已過立春）');

// 2. 紫微虛歲以農曆年計：1990-01-01 子時出生（農曆己巳 1989 年，火六局）
{
  const z = calculateZiweiAstrolabe({ year: 1990, month: 1, day: 1, hourIdx: 2, gender: '男' });
  ok(z.lunarYear === 1989, `1990-01-01 的農曆年為 1989（得 ${z.lunarYear}）`);
  // 農曆 2024 年：虛歲 = 2024-1989+1 = 36 → 火六局大限 36–45；若誤用陽曆年會得 35 → 26–35
  const cur = analyzeDecadals(z, 2024).find((x) => x.current);
  ok(cur && cur.range[0] === 36, `農曆 2024 年虛歲 36 → 大限 ${cur?.range}`);
  const wrong = analyzeDecadals({ ...z, lunarYear: undefined }, 2024).find((x) => x.current);
  ok(wrong.range[0] === 26, '（對照）舊算法誤用陽曆年會落在前一大限 26–35');
}

// 3. 八字：流年以立春換年；大運以精確日期換運
{
  const utc = d('1990-01-10T04:00:00Z');
  const p = calculatePillars(1990, 1, 10, 6, { utc });
  const b1 = analyzeBazi(p, { gender: '男', utc, now: d('2027-01-15T04:00:00Z') });
  const b2 = analyzeBazi(p, { gender: '男', utc, now: d('2027-02-10T04:00:00Z') });
  ok(b1.years[0].year === 2026 && b2.years[0].year === 2027, '八字流年於立春換年');
  const c = b1.luck.cycles[1];
  const before = analyzeBazi(p, { gender: '男', utc, now: new Date(c.fromDate.getTime() - 86400000) }).luck.cycles;
  const after = analyzeBazi(p, { gender: '男', utc, now: new Date(c.fromDate.getTime() + 86400000) }).luck.cycles;
  ok(before[0].current && !before[1].current && after[1].current && !after[0].current, '大運於起運精確日期換運（非 1/1）');
}

// 4. 八字強弱：得令與通根
{
  const strong = analyzeBazi({ year: '甲寅', month: '丙寅', day: '甲寅', hour: '乙亥' }, { gender: '男' });
  const weak = analyzeBazi({ year: '壬申', month: '庚申', day: '甲申', hour: '庚午' }, { gender: '男' });
  ok(['身強', '偏強'].includes(strong.strength.label) && strong.strength.deLing, `甲生寅月、多木 → ${strong.strength.label}`);
  ok(['身弱', '偏弱'].includes(weak.strength.label) && !weak.strength.deLing, `甲生申月、金旺 → ${weak.strength.label}`);
}

// 5. 調候：冬生火不足 → 火列為優先喜用
{
  const w = analyzeBazi({ year: '壬子', month: '壬子', day: '壬子', hour: '辛亥' }, { gender: '男' });
  ok(w.yongshen.favorable[0] === '火' && w.yongshen.tiaohouElement === '火', `冬水泛濫，調候取火（喜：${w.yongshen.favorable}）`);
  const s = analyzeBazi({ year: '丙午', month: '甲午', day: '丙午', hour: '甲午' }, { gender: '男' });
  ok(s.yongshen.tiaohouElement === '水', '夏生火炎，調候取水');
}

// 6. 流年刑沖合害破
{
  const b = analyzeBazi({ year: '甲子', month: '丙子', day: '戊子', hour: '庚申' }, { gender: '男', nowYear: 2026 });
  const y2026 = b.years[0]; // 丙午
  ok(y2026.flags.some((f) => f.startsWith('沖')), `2026 丙午沖原局子：${y2026.flags.slice(0, 2)}`);
  const b2 = analyzeBazi({ year: '甲申', month: '丙子', day: '戊子', hour: '庚午' }, { gender: '男', nowYear: 2024 });
  ok(b2.years[0].gz === '甲辰' && b2.years[0].flags.some((f) => f.includes('三合水局')), '原局申、子 + 流年辰 → 三合水局（2024 甲辰）');
}

// 7. 六爻：性別決定感情用神；用神不現取伏神
{
  ok(getTopicYongShen('感情', '男').relation === '妻財' && getTopicYongShen('感情', '女').relation === '官鬼', '感情：男妻財、女官鬼');
  const BR = ['子', '寅', '辰', '午', '申', '戌']; // 乾卦內外
  const WX = { 子: '水', 寅: '木', 辰: '土', 午: '火', 申: '金', 戌: '土' };
  const lines = BR.map((b, i) => ({
    lineNum: i + 1, branch: b, wuxing: WX[b], relation: '兄弟', beast: '青龍', isShi: i === 0, isYing: i === 3,
    isMoving: false, isKongWang: false, isYuePo: false, bit: 1,
  }));
  const pillars = { monthBranch: '午', dayBranch: '子', yuePoBranch: '子', riPoBranch: '午', kongWang: [], dayStem: '甲', monthStem: '甲' };
  const ev = evaluateDivination({ topic: '財運', pillars, linesData: lines, movingLine: null, palaceWuxing: '金', originalHex: {}, changedHex: {}, nuclearHex: {}, gender: '男', palaceId: 1 });
  ok(ev.warnings?.some((w) => w.includes('伏神')), '用神（妻財）不現 → 取伏神並說明');
}

// 8. 八字合婚
{
  const A = { dayStem: '甲', dayBranch: '子', yearBranch: '子' };
  const good = compareBazi(A, { dayStem: '己', dayBranch: '丑', yearBranch: '丑' }, null, null);
  const bad = compareBazi(A, { dayStem: '庚', dayBranch: '午', yearBranch: '午' }, null, null);
  ok(good.score > bad.score && good.notes.some((n) => n.text.includes('六合')) && bad.notes.some((n) => n.text.includes('相沖')), `合婚：甲己合＋子丑合 (${good.score}) > 子午沖 (${bad.score})`);
}

console.log(fail ? `\n${fail} 項失敗` : '\n全部通過');
process.exit(fail ? 1 : 0);
