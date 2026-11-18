/**
 * 雙人合盤與融合總論的回歸驗證：node scripts/verify-synastry-fusion.mjs
 * 涵蓋：五維用語、無交集中性等級、易經世爻・卦宮標籤、人類圖時間不詳提醒、
 * 1900-01-31 前日期驗證、融合拉扯規則、融合文字細節、融合提示詞五行不含易經。
 */
import fs from 'node:fs';
import {
  computeFullProfile, compareProfiles, generatePairPrompt, generateFusionPrompt, validateBirth,
  tierOf, levelOf, astroThemeLevels, elementTallyOf, DEFAULT_BIRTH,
} from '../src/utils/profile.js';
import { buildFusionSummary, collectThemeVotes, findTensions } from '../src/utils/fusionSummary.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('✗ FAIL', m); } else console.log('✓', m); };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const birth = (o) => ({ ...DEFAULT_BIRTH, ...o });
const A = computeFullProfile(birth({ name: '甲', year: '1995', month: '5', day: '20', hour: '10' }));
const B = computeFullProfile(birth({ name: '乙', gender: '女', year: '1996', month: '9', day: '18', hour: '19' }));
const Bu = computeFullProfile(birth({ name: '乙', gender: '女', year: '1996', month: '9', day: '18', timeKnown: false }));

// 偽隨機生辰樣本（固定種子，結果可重現）
let seed = 20261118;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const sample = Array.from({ length: 160 }, (_, i) => computeFullProfile(birth({
  name: `樣本${i}`, year: String(1950 + Math.floor(rnd() * 60)), month: String(1 + Math.floor(rnd() * 12)),
  day: String(1 + Math.floor(rnd() * 28)), hour: String(Math.floor(rnd() * 24)), minute: String(Math.floor(rnd() * 60)),
  timeKnown: i % 8 !== 7, // 每 8 筆有 1 筆時間不詳
})));

// ── 1. 五維用語 ──
{
  const cmp = compareProfiles(A, B);
  const prompt = generatePairPrompt(A, B, cmp);
  ok(cmp.dims.length === 5, `兩人時間皆知：5 個面向（得 ${cmp.dims.length}）`);
  ok(prompt.includes('五維') && prompt.includes('五個體系') && !prompt.includes('四維') && !prompt.includes('四個體系'), '合盤提示詞寫「五維／五個體系」，不再寫四個');
  ok(prompt.includes('八字合婚、易經、紫微斗數、西洋占星與人類圖'), '合盤提示詞開頭列出五個體系');
  const cmpU = compareProfiles(A, Bu);
  ok(cmpU.dims.length === 4 && generatePairPrompt(A, Bu, cmpU).includes('四個體系'), '紫微缺席時提示詞寫「四個體系」（依實際參與數）');
  ok(tierOf(90).desc.startsWith('五個體系') && tierOf(90, 4).desc.startsWith('四個體系'), '天作之合描述依體系數寫五個／四個');
  const ui = read('src/components/SynastryReport.jsx');
  ok(!ui.includes('四維') && !ui.includes('四個系統') && ui.includes('計算五維合盤'), '合盤頁面按鈕與說明不再寫四維');
  const help = read('src/data/help/synastry.js');
  ok(!help.includes('四維'), '合盤說明不再提「四維」');
}

// ── 2. 無交集＝中性，不顯示「張力較大」 ──
{
  // 甲六點都在 0°，乙都在 45°（半四分相不在相位表內）→ 沒有任何跨盤相位
  const at = (p, lon) => ({
    ...p, astro: { ...p.astro, positions: Object.fromEntries(Object.entries(p.astro.positions).map(([k, v]) => [k, { ...v, lon }])) },
  });
  const pA = at(A, 0); const pB = at(B, 45);
  const cmp = compareProfiles(pA, pB);
  const astro = cmp.dims.find((d) => d.key === 'astro');
  ok(cmp.astro.aspects.length === 0, '構造：兩盤無跨盤相位');
  ok(astro.neutral && astro.levelLabel === '交集少' && astro.levelLabel !== '張力較大', `占星無相位 → 中性「交集少」（得 ${astro.levelLabel}）`);
  ok(cmp.astroThemes.every((t) => t.neutral && t.levelLabel === '交集少'), '占星三主題無相位 → 皆為「交集少」');
  const scored = cmp.dims.filter((d) => !d.neutral);
  const expect = Math.max(30, Math.min(98, Math.round(scored.reduce((s, d) => s + d.score, 0) / scored.length)));
  ok(cmp.overall === expect, `中性面向不列入綜合平均（得 ${cmp.overall}，應為 ${expect}）`);
  ok(generatePairPrompt(pA, pB, cmp).includes('交集少（交集少，無明顯共鳴也無明顯張力）'), '提示詞對中性面向附上說明');

  const t = astroThemeLevels({ themeScore: { 靈魂共鳴: 50, 情感溝通: 56, 吸引力: 50 }, aspects: [{ theme: '情感溝通' }] });
  ok(t[0].neutral && !t[1].neutral && t[1].levelLabel === levelOf(56).levelLabel && t[2].neutral, '主題等級：只有沒相位的主題是中性，其餘照門檻');

  // 人類圖：兩人都沒有閘門 → 沒有任何通道
  const noGates = (p) => ({ ...p, hd: { ...p.hd, activeGates: [] } });
  const cmpH = compareProfiles(noGates(A), noGates({ ...B, hd: { ...B.hd, typeInfo: A.hd.typeInfo } }));
  const hd = cmpH.dims.find((d) => d.key === 'hd');
  ok(hd.neutral && hd.levelLabel === '交集少', `人類圖無通道且同類型 → 中性（原本 53 分會顯示張力較大；得 ${hd.levelLabel}）`);

  // 正常情況：分數與等級不變
  const n = compareProfiles(A, B);
  const nAstro = n.dims.find((d) => d.key === 'astro');
  ok(n.astro.aspects.length > 0 && !nAstro.neutral && nAstro.score === n.astro.score && nAstro.levelLabel === levelOf(n.astro.score).levelLabel, '有相位時占星照原分數與門檻');
  const avg = Math.max(30, Math.min(98, Math.round(n.dims.reduce((s, d) => s + d.score, 0) / n.dims.length)));
  ok(n.dims.every((d) => !d.neutral) ? n.overall === avg : true, '無中性面向時綜合分數＝全部平均（與原算法相同）');
}

// ── 3. 易經卡：世爻・卦宮，等第與其他面向同一組 ──
{
  const cmp = compareProfiles(A, B);
  const d = cmp.dims.find((x) => x.key === 'iching');
  ok(d.label === '易經世爻・卦宮', `易經面向標籤（得 ${d.label}）`);
  ok(cmp.iching.tier === levelOf(d.score).levelLabel, `易經卡等第用五級文字（得 ${cmp.iching.tier}）`);
  ok(!/世應/.test(read('src/components/SynastryReport.jsx')), '合盤頁不再寫「世應」');
}

// ── 4. 人類圖時間不詳提醒 ──
{
  ok(compareProfiles(A, B).hdCaveat === null, '兩人時間皆知：無人類圖提醒');
  const cmp = compareProfiles(A, Bu);
  ok(typeof cmp.hdCaveat === 'string' && cmp.hdCaveat.includes('乙出生時間不詳'), '一方時間不詳：產生人類圖提醒');
  ok(cmp.dims.find((x) => x.key === 'hd').uncertain === true, '人類圖面向標記 uncertain');
  ok(generatePairPrompt(A, Bu, cmp).includes('人類圖可信度'), '合盤提示詞帶入人類圖提醒');
}

// ── 5. 1900-01-31 前的日期在驗證就擋下 ──
{
  let allBlocked = true;
  for (let d = 1; d <= 30; d += 1) {
    const e = validateBirth(birth({ year: '1900', month: '1', day: String(d), hour: '12' }));
    if (!e || !e.includes('1900 年 1 月 31 日')) allBlocked = false;
  }
  ok(allBlocked, '1900-01-01～01-30 都回傳友善的驗證訊息');
  ok(validateBirth(birth({ year: '1900', month: '1', day: '31', hour: '12' })) === null, '1900-01-31 通過驗證');
  let threw = null;
  try { computeFullProfile(birth({ year: '1900', month: '1', day: '31', hour: '0' })); } catch (e) { threw = e.message; }
  ok(threw === null, `1900-01-31 00:00 可排盤${threw ? `（${threw}）` : ''}`);
  threw = null;
  try { computeFullProfile(birth({ year: '1900', month: '1', day: '15', hour: '12' })); } catch (e) { threw = e.message; }
  ok(threw && threw.includes('1900 年 1 月 31 日'), '1900-01-15 由 validateBirth 擋下（不是 lunar.js 的 RangeError）');
}

// ── 6／7. 融合拉扯規則 ──
{
  const V = (o) => Object.fromEntries(Object.entries(o).map(([s, m]) => [s, new Map(Object.entries(m))]));
  // 占星、人類圖都同時投情感與理性 → 不列（兩邊相同）
  ok(findTensions(V({ ziwei: { mind: 2 }, astro: { emotion: 1, mind: 1 }, hd: { emotion: 1, mind: 1 } })).length === 0, '兩邊同一批體系 → 不列拉扯');
  // 人類圖類型一票「等待」+ 占星「主動」→ 一家對一家，不列
  ok(findTensions(V({ astro: { initiate: 2 }, hd: { respond: 1 } })).length === 0, '人類圖一票等待 vs 占星主動（一對一）→ 不列');
  // 紫微＋占星都只投主動（≥3 票），人類圖投等待 → 列出
  const t = findTensions(V({ ziwei: { initiate: 2 }, astro: { initiate: 2 }, hd: { respond: 1 } }));
  ok(t.length === 1 && t[0].keys[0] === 'initiate' && t[0].sideA.join() === 'ziwei,astro' && t[0].sideB.join() === 'hd', '紫微＋占星主動 vs 人類圖等待（二對一）→ 列出');
  // 共識那邊票數不足 3 → 不列
  ok(findTensions(V({ ziwei: { initiate: 1 }, astro: { initiate: 1 }, hd: { respond: 1 } })).length === 0, '二對一但只有 2 票 → 不列（與共識門檻一致）');

  let overlap = 0; let initResp = 0; let twoSysTension = 0;
  for (const p of sample) {
    const s = buildFusionSummary(p);
    for (const x of s.tensions) {
      const a = x.sideA.split('、'); const b = x.sideB.split('、');
      if (a.some((k) => b.includes(k)) || !x.sideA || !x.sideB) overlap += 1;
      if (x.keys[0] === 'initiate') initResp += 1;
    }
    if (s.systemCount === 2 && s.tensions.length) twoSysTension += 1;
  }
  ok(overlap === 0, `隨機 ${sample.length} 盤：拉扯兩邊沒有重複體系（違規 ${overlap}）`);
  ok(initResp / sample.length < 0.5, `「主動 vs 等待」不再幾乎人人都有（${initResp}/${sample.length}，舊規則約 85%）`);
  ok(twoSysTension === 0, '只有兩家時不判定拉扯');
}

// ── 8. 融合文字細節 ──
{
  const sU = buildFusionSummary(Bu);
  ok(sU.systemCount === 2 && sU.systems.join() === '占星,人類圖', '時間不詳：參與體系只有占星、人類圖');
  ok(sU.themes.every((t) => t.by.length <= sU.systemCount), '共識標籤的家數不超過實際參與數');
  ok(read('src/components/panels/FusionPanel.jsx').includes('/{summary.systemCount} 家') && !read('src/components/panels/FusionPanel.jsx').includes('/3 家'), '主題標籤用實際家數（不寫死 /3）');
  const allText = sU.paragraphs.map((x) => x.text).join('\n');
  ok(!allText.includes('紫微看到命宮（') && !allText.includes('紫微命宮（出生時間不詳') && allText.includes('紫微無法排盤'), '時間不詳：開場與建議不再出現「紫微看到命宮（出生時間不詳，未排）」');
  ok(!/三家/.test(allText), '時間不詳：總論不寫「三家」');

  ok(A.elements.voters === 3 && A.elements.caveat.includes('共 3 個體系'), '五行說明：時間已知共 3 個體系');
  ok(Bu.elements.voters === 2 && Bu.elements.caveat.includes('共 2 個體系') && !Bu.elements.caveat.includes('共 3'), '五行說明：時間不詳寫共 2 個體系');
  ok(generateFusionPrompt(Bu).length > 0 && !/共 3 體系/.test(read('src/utils/profile.js')), '提示詞不再寫死「共 3 體系」');

  let badTalent = 0; let dupSolo = 0; let sawFallen = 0; let heartChecked = 0; let heartBad = 0;
  for (const p of sample) {
    const s = buildFusionSummary(p);
    const talent = s.paragraphs.find((x) => x.title === '天賦與課題').text.split('\n')[0];
    if (/陷|不易發揮|化忌/.test(talent)) badTalent += 1;
    if ((p.ziwei?.corePalaces.soul?.majorStars || []).some((x) => /陷|不/.test(x.brightness || ''))) sawFallen += 1;
    const solo = s.paragraphs.find((x) => x.title === '共同底色').text;
    for (const sys of ['紫微', '占星', '人類圖']) if ((solo.match(new RegExp(`${sys}特別強調`, 'g')) || []).length > 1) dupSolo += 1;
    if (p.hd.centers.heart.isDefined) {
      heartChecked += 1;
      if (!collectThemeVotes(p).votes.hd.has('authority')) heartBad += 1;
    }
  }
  ok(sawFallen > 0 && badTalent === 0, `天賦不引用落陷／化忌星（樣本含 ${sawFallen} 盤落陷，違規 ${badTalent}）`);
  ok(dupSolo === 0, '單家強調同一家合併成一句（無「紫微特別強調…，紫微特別強調…」）');
  ok(heartChecked > 0 && heartBad === 0, `意志力（heart）中心有定義 → 投領導與責任（${heartChecked} 盤）`);
  ok(!read('src/utils/fusionSummary.js').includes('centers.ego'), '不再讀取不存在的 centers.ego');
}

// ── 9. 融合提示詞的五行不含易經 ──
{
  for (const p of [A, Bu]) {
    const prompt = generateFusionPrompt(p);
    const sec = prompt.match(/【跨體系五行指向[^\n]*】\n[^\n]*/)?.[0] || '';
    const el = elementTallyOf(p.elements, ['易經']);
    const dist = Object.entries(el.tally).map(([k, v]) => `${k}${v}`).join(' ');
    ok(sec && !sec.includes('易經') && sec.includes(dist), `${p.name}：融合提示詞五行只計${el.voterNames.join('、')}（${dist}）`);
    ok(!prompt.includes('【一、易經命卦】') && !prompt.includes('世爻：'), `${p.name}：融合提示詞不含易經段落`);
  }
  const full = Object.values(A.elements.tally).reduce((s, v) => s + v, 0);
  const noYi = Object.values(elementTallyOf(A.elements, ['易經']).tally).reduce((s, v) => s + v, 0);
  ok(noYi === full - A.elements.bySystem.易經.length, '排除易經後總票數正好少了易經的票');
}

console.log(fail ? `\n${fail} 項失敗` : '\n全部通過');
process.exit(fail ? 1 : 0);
