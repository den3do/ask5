/**
 * 占星／紫微修正的回歸測試：node scripts/verify-astro-ziwei.mjs
 * 1 合盤略過時間不詳者的上升；2 北交點標籤；3 六分相為主要相位、相位列表依容許度排序；
 * 4 時間不詳不顯示上升／宮位；5 行運找不到時不留空白標籤；7 天馬不列為助力；
 * 8 紫微盤煞星顏色與中堂標題；9 紫微 AI 提示詞含三個流年。
 */
import { readFileSync } from 'node:fs';
import {
  ASPECTS, aspectBetween, majorAspectsByOrb, calculateAstroChart, calculateSynastry, generateAstrologyAiPrompt, calculateLifeTransits,
} from '../src/utils/astrology.js';
import { norm360 } from '../src/utils/ephemeris.js';
import { buildAstroStory, buildZiweiStory, describePalace } from '../src/utils/lifeReading.js';
import { calculateZiweiAstrolabe, generateZiweiAiPrompt } from '../src/utils/ziwei.js';
import { lunarYearOf } from '../src/utils/lunar.js';
import { AS_ASPECT } from '../src/data/lifeData.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('✗ FAIL', m); } else console.log('✓', m); };
const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const base = { year: 1990, month: 6, day: 15, lat: 25.033, lon: 121.5654, tz: 8 };
const known = calculateAstroChart({ ...base, hour: 9, minute: 30, timeKnown: true });
const unknown = calculateAstroChart({ ...base, timeKnown: false });

// 1. 合盤：時間不詳的盤沒有真實上升，牽涉其上升的組合要略過
{
  ok(unknown.timeUnknown === true && known.timeUnknown === false, '星盤以 timeUnknown 標示出生時間不詳');
  // 對照組：若把不詳盤當成已知，上升（＝太陽占位）會和對方太陽形成假相位
  const control = calculateSynastry({ ...unknown, timeUnknown: false }, known);
  ok(control.aspects.some((x) => x.a === 'asc'), '（對照）把占位上升當真時，會出現「上升 × 對方行星」的假相位');
  const s = calculateSynastry(unknown, known);
  ok(!s.aspects.some((x) => x.a === 'asc'), '時間不詳者（A）的上升不參與合盤相位');
  const s2 = calculateSynastry(known, unknown);
  ok(!s2.aspects.some((x) => x.b === 'asc'), '時間不詳者（B）的上升不參與合盤相位');
  const both = calculateSynastry(unknown, unknown);
  ok(!both.aspects.some((x) => x.a === 'asc' || x.b === 'asc'), '雙方皆不詳：完全不出現上升');
  ok([s, s2, both].every((r) => r.score >= 30 && r.score <= 95 && Object.values(r.themeScore).every((v) => v >= 30 && v <= 98)), '略過上升後分數仍在合理範圍');
  const kk = calculateSynastry(known, calculateAstroChart({ ...base, day: 20, hour: 21, minute: 0, timeKnown: true }));
  ok(kk.aspects.every((x, i, arr) => i === 0 || arr[i - 1].orb <= x.orb), '雙方時間已知：合盤相位仍依容許度排序（計分流程不變）');
}

// 2. 北交點有中文標籤，圓盤會畫出符號
{
  ok(/northNode:\s*\{\s*label:\s*'北交點'/.test(src('src/components/AstroChart.jsx')), 'AstroChart 的 PLANET_INFO 有北交點');
  const panel = src('src/components/panels/AstroPanel.jsx');
  ok(/const GLYPH = \{[^}]*northNode:\s*'☊'/.test(panel), '圓盤的 GLYPH 有北交點 ☊（圓盤與位置對照會畫出）');
  ok(/const NAMES = \{[^}]*northNode:\s*'北交點'/.test(panel), '行星位置對照的名稱表有北交點');
}

// 3. 六分相為主要相位；相位列表只列主要相位並依容許度排序
{
  const sext = ASPECTS.find((a) => a.angle === 60);
  ok(sext.nature === 'major', '六分相標為 major');
  ok(ASPECTS.filter((a) => a.nature === 'major').map((a) => a.angle).sort((x, y) => x - y).join() === '0,60,90,120,180', '主要相位＝托勒密五大相位');
  ok(AS_ASPECT[sext.name]?.[1] === 'good', '一生詳述把六分相算和諧（與 major 一致）');
  const fake = [
    { planet1: 'sun', planet2: 'saturn', ...aspectBetween(0, 93) },
    { planet1: 'sun', planet2: 'moon', ...aspectBetween(0, 61) },
    { planet1: 'venus', planet2: 'mars', ...aspectBetween(0, 150.5) },
  ];
  const m = majorAspectsByOrb(fake);
  ok(m.length === 2 && m[0].name === '六分相' && m[1].name === '四分相', `主要相位列表排除 150°、依容許度排序（得 ${m.map((x) => x.name).join('、')}）`);
  const prompt = generateAstrologyAiPrompt({ ...known, aspects: fake }, '測試');
  ok(prompt.includes('太陽六分相月亮'), 'AI 提示詞包含六分相');
  ok(!prompt.includes('十二分之五相'), 'AI 提示詞不含 150° 次要相位');
}

// 4. 時間不詳：不把占位上升／宮位當真
{
  const p = generateAstrologyAiPrompt(unknown, '測試');
  ok(!/上升：|天頂：|第\d+宮/.test(p), '時間不詳：AI 提示詞不列上升、天頂與宮位');
  ok(p.includes('出生時間不詳，上升無法確定'), '時間不詳：AI 提示詞請 AI 略過上升星座');
  ok(!unknown.aspects.some((a) => ['asc', 'mc'].includes(a.planet1) || ['asc', 'mc'].includes(a.planet2)), '時間不詳：本命相位不含上升與天頂');
  ok(unknown.warnings[0].includes('不顯示上升、天頂與宮位'), '時間不詳：警示說明不顯示上升與宮位');
  const panel = src('src/components/panels/AstroPanel.jsx');
  ok(/known && \[\['AC', asc\]/.test(panel) && /known && \[asc, chart\.mc\.lon\]/.test(panel), '時間不詳：圓盤不畫 AC/MC 與軸線');
  ok(src('src/components/AstroChart.jsx').includes('出生時間不詳，無法確定'), '時間不詳：上升卡片顯示無法確定');
}

// 5. 行運搜尋區間找不到時，不留下「土星回歸：」這種空白標籤
{
  const normal = buildAstroStory(known);
  ok(normal.stages.length === 6 && normal.stages.every((s) => !/：\s*$/.test(s.range)), `正常情況六個階段皆有年齡（${normal.stages.map((s) => s.range).join('｜')}）`);
  const sat = known.positions.saturn;
  const moved = { ...known, positions: { ...known.positions, saturn: { ...sat, lon: norm360(sat.lon + 180) } } };
  const t = calculateLifeTransits(moved);
  ok(t.find((x) => x.key === 'satReturn1').ages.length === 0, '（構造）土星移到對面時，26–32 歲區間找不到回歸');
  const st = buildAstroStory(moved);
  ok(st.stages.every((s) => !/：\s*$/.test(s.range) && !/：\s*歲/.test(s.range)), '找不到時沒有空白的階段標籤');
  ok(!st.stages.some((s) => s.title.startsWith('第一次土星回歸')), '找不到的階段整段省略');
  const jupNone = calculateLifeTransits({ ...known, positions: { ...known.positions, jupiter: { ...known.positions.jupiter, lon: norm360(known.positions.jupiter.lon + 180) } } }).find((x) => x.key === 'jupReturn');
  ok(jupNone.ages.length === 0 && jupNone.text.includes('此區間未找到') && !jupNone.text.includes('— 歲'), '木星回歸找不到時文字明確（不出現「— 歲」）');
}

// 7. 紫微：天馬（mid）不列為助力
{
  let checked = 0;
  for (const [year, month, day, hourIdx] of [[1990, 1, 1, 2], [1985, 6, 15, 7], [2000, 3, 3, 11], [1975, 11, 20, 0]]) {
    const z = calculateZiweiAstrolabe({ year, month, day, hourIdx, gender: '男' });
    const p = z.palaces.find((x) => x.minorStars.some((s) => s.name === '天馬'));
    if (!p) continue;
    checked++;
    const { text } = describePalace(z, p);
    ok(!/助力：[^。]*天馬/.test(text), `${year}-${month}-${day}：${p.name}的天馬不列在助力`);
    ok(/另見：[^。]*天馬/.test(text), `${year}-${month}-${day}：天馬以中性「另見」列出`);
    const story = buildZiweiStory(z);
    ok(!story.strengths.some((s) => s.includes('天馬')), `${year}-${month}-${day}：優點不含天馬`);
  }
  ok(checked >= 1, `至少檢查到一張含天馬的盤（${checked}）`);
}

// 8. 紫微盤：煞星紅字清單不含雜曜「天空」，中堂不用八卦術語
{
  const plate = src('src/components/ZiweiPlate.jsx');
  const red = plate.match(/\[('擎羊'[^\]]*)\]\.includes/)?.[1] || '';
  ok(red && !red.includes('天空') && red.includes('地空'), `煞星紅字清單：${red}`);
  ok(!plate.includes('文王後天') && plate.includes('紫微斗數全盤'), '中堂標題為「紫微斗數全盤」');
}

// 9. 紫微 AI 提示詞的流年數＝一生詳述的流年數（3）
{
  const z = calculateZiweiAstrolabe({ year: 1990, month: 6, day: 15, hourIdx: 5, gender: '女' });
  const prompt = generateZiweiAiPrompt(z, '測試');
  const years = [...prompt.matchAll(/^(\d{4}) 流年（/gm)].map((m) => Number(m[1]));
  const ny = lunarYearOf();
  ok(years.join() === [ny, ny + 1, ny + 2].join(), `AI 提示詞含三個流年（${years.join('、')}）`);
  const storyYears = buildZiweiStory(z).stages.filter((s) => s.range.includes('流年')).map((s) => Number(s.range.slice(0, 4)));
  ok(storyYears.join() === years.join(), '與一生詳述的流年一致');
  ok(prompt.includes('近三年流年四化'), 'AI 提示詞的運限問題寫「近三年」');
}

console.log(fail ? `\n${fail} 項失敗` : '\n全部通過');
process.exit(fail ? 1 : 0);
