import { QUESTIONS, TYPES } from '../src/data/mbti.js';
import { getQuestions, scoreMbti } from '../src/utils/mbti.js';
let bad = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL', m); bad++; } };
ok(QUESTIONS.length === 60, '60 題');
ok(getQuestions(12).length === 12, '12 題');
for (const d of ['EI', 'SN', 'TF', 'JP']) {
  ok(getQuestions(60).filter((q) => q.d === d).length === 15, d + ' 15 題');
  const s = getQuestions(12).filter((q) => q.d === d);
  ok(s.length === 3 && new Set(s.map((q) => q.p)).size === 2, d + ' 12 題版正反極');
}
ok(Object.keys(TYPES).length === 16, '16 型');
for (const mode of [12, 60]) {
  const qs = getQuestions(mode);
  const all = (pick) => Object.fromEntries(qs.map((q) => [q.id, pick.includes(q.p) ? 5 : 1]));
  ok(scoreMbti(all(['E', 'S', 'T', 'J']), mode).type === 'ESTJ', mode + ' ESTJ');
  ok(scoreMbti(all(['I', 'N', 'F', 'P']), mode).type === 'INFP', mode + ' INFP');
  ok(scoreMbti(all(['E', 'N', 'F', 'J']), mode).dims.EI.aPct === 100, mode + ' 100%');
  ok(scoreMbti(Object.fromEntries(qs.map((q) => [q.id, 3])), mode).dims.EI.tie, mode + ' tie');
}
if (bad) process.exit(1);
console.log('verify-mbti: OK');
import { buildRecord, parseRecord } from '../src/utils/mbti.js';
{
  const qs = getQuestions(12);
  const rec = buildRecord({ name: '測', mode: 12, answers: Object.fromEntries(qs.map((q) => [q.id, 4])) });
  const back = parseRecord(JSON.stringify(rec));
  if (!back || back.type !== rec.type) { console.error('FAIL 存檔往返'); process.exit(1); }
  if (parseRecord('{"app":"x"}') || parseRecord('壞掉')) { console.error('FAIL 應拒絕無效檔'); process.exit(1); }
  console.log('verify-mbti: 存檔往返 OK');
}
import { parseBirthProfile, FILE_TAG } from '../src/utils/savedProfiles.js';
{
  const tpl = { name: '', year: '1990', hour: '', unknown: false };
  const good = JSON.stringify({ app: FILE_TAG, birth: { name: '甲', year: 1995, evil: 'x', unknown: 1 } });
  const r = parseBirthProfile(good, tpl);
  if (!r.ok || r.birth.name !== '甲' || r.birth.year !== '1995' || 'evil' in r.birth || r.birth.unknown !== true) { console.error('FAIL 生辰存檔解析', r); process.exit(1); }
  if (parseBirthProfile('{"app":"other","birth":{}}', tpl).ok) { console.error('FAIL 應拒絕非本站檔'); process.exit(1); }
  console.log('verify-mbti: 生辰存檔 OK');
}
import { DETAIL, LETTER_NOTES } from '../src/data/mbtiDetail.js';
import { buildMatchGuide, buildMatchText } from '../src/utils/mbtiMatch.js';
{
  for (const t of Object.keys(TYPES)) {
    const d = DETAIL[t];
    if (!d || !d.portrait || !d.work || !d.stress || !d.comm || !d.needs || d.tips.length !== 3) { console.error('FAIL 缺少詳細資料', t); process.exit(1); }
  }
  for (const L of 'EISNTFJP') if (!LETTER_NOTES[L]) { console.error('FAIL 字母說明', L); process.exit(1); }
  let n = 0;
  for (const x of Object.keys(TYPES)) for (const y of Object.keys(TYPES)) {
    const g = buildMatchGuide({ type: x, name: '甲' }, { type: y, name: '乙' });
    const txt = buildMatchText(g, { type: x }, { type: y });
    if (!g || g.dims.length !== 4 || !g.insights.length || /\{[xy]\}|undefined/.test(txt)) { console.error('FAIL 配對', x, y); process.exit(1); }
    n++;
  }
  const same = buildMatchGuide({ type: 'ENFP' }, { type: 'ENFP' });
  const opp = buildMatchGuide({ type: 'ENFP' }, { type: 'ISTJ' });
  if (same.meet.same !== 4 || opp.meet.same !== 0) { console.error('FAIL 相同維度計數'); process.exit(1); }
  console.log(`verify-mbti: 配對 ${n} 組 OK`);
}
import { questionSetId, checkRecord, typeFromRecord } from '../src/utils/mbti.js';
{
  // 兩極權重相同:全同意/全不同意/全中立(以及全非常同意等)每個維度都剛好 50%
  for (const mode of [12, 60]) {
    const qs = getQuestions(mode);
    for (const v of [1, 2, 3, 4, 5]) {
      const r = scoreMbti(Object.fromEntries(qs.map((q) => [q.id, v])), mode);
      for (const [k, d] of Object.entries(r.dims)) {
        if (d.aPct !== 50 || !d.tie || d.letter !== d.b) { console.error('FAIL 全答', v, mode, k, d.aPct); process.exit(1); }
      }
      if (r.type !== 'INFP') { console.error('FAIL 全答同值持平應為 INFP', v, mode, r.type); process.exit(1); }
    }
    // 明確答法仍得預期類型,且各維度 100%/0%
    for (const t of ['ENTJ', 'ISFP', 'ESTP', 'INFJ']) {
      const r = scoreMbti(Object.fromEntries(qs.map((q) => [q.id, t.includes(q.p) ? 5 : 1])), mode);
      if (r.type !== t || Object.values(r.dims).some((d) => d.strength !== 100)) { console.error('FAIL 明確答法', mode, t, r.type); process.exit(1); }
    }
    // 中等答法:同意自己那極(4)、不同意另一極(2)→ 75%
    const r = scoreMbti(Object.fromEntries(qs.map((q) => [q.id, 'ESFJ'.includes(q.p) ? 4 : 2])), mode);
    if (r.type !== 'ESFJ' || r.dims.EI.aPct !== 75 || r.dims.SN.aPct !== 75) { console.error('FAIL 中等答法', mode, r.type, r.dims.EI.aPct); process.exit(1); }
  }
  // 說明頁的例子:快速版能量來源 E 同意、I 非常同意、E 不同意 → E 25%
  {
    const [e1, i1, e2] = getQuestions(12).filter((q) => q.d === 'EI');
    if (e1.p !== 'E' || i1.p !== 'I' || e2.p !== 'E') { console.error('FAIL 說明例子題目順序'); process.exit(1); }
    const d = scoreMbti({ [e1.id]: 4, [i1.id]: 5, [e2.id]: 2 }, 12).dims.EI;
    if (d.aPct !== 25 || d.letter !== 'I' || d.strength !== 50) { console.error('FAIL 說明例子', d); process.exit(1); }
  }

  // 題庫指紋
  const qs60 = getQuestions(60);
  const ans60 = Object.fromEntries(qs60.map((q) => [q.id, 'INTJ'.includes(q.p) ? 5 : 1]));
  const rec = buildRecord({ name: '甲', mode: 60, answers: ans60 });
  if (rec.qset !== questionSetId(60) || questionSetId(12) === questionSetId(60) || !/^60-60-[0-9a-f]{8}$/.test(rec.qset)) { console.error('FAIL 題庫指紋格式', rec.qset); process.exit(1); }
  const back = checkRecord(JSON.stringify(rec));
  if (!back.rec || back.rec.type !== 'INTJ') { console.error('FAIL 新存檔往返'); process.exit(1); }
  // 舊版存檔(沒有指紋、version 1、記錄的 type 與 percents 是舊算法)仍可載入,並依作答重算
  const old = { app: 'ask5-mbti', version: 1, name: '舊', mode: 12, date: '2025-01-01T00:00:00.000Z', type: 'ESTJ', percents: { EI: 58, SN: 58, TF: 58, JP: 58 },
    answers: Object.fromEntries(getQuestions(12).map((q) => [q.id, 4])) };
  const o = checkRecord(JSON.stringify(old));
  if (!o.rec || o.rec.type !== 'INFP' || o.rec.percents.EI !== 50 || parseRecord(JSON.stringify(old))?.type !== 'INFP') { console.error('FAIL 舊存檔載入/重算', o); process.exit(1); }
  // 指紋不符 → 拒絕並給出題目已更動的訊息
  const bad = checkRecord(JSON.stringify({ ...rec, qset: '60-60-deadbeef' }));
  if (bad.rec || !/題目/.test(bad.error) || parseRecord(JSON.stringify({ ...rec, qset: 'x' }))) { console.error('FAIL 指紋不符應拒絕', bad); process.exit(1); }
  // 12 題存檔換成 60 題指紋也要拒絕
  const rec12 = buildRecord({ name: '乙', mode: 12, answers: Object.fromEntries(getQuestions(12).map((q) => [q.id, 3])) });
  if (checkRecord(JSON.stringify({ ...rec12, qset: questionSetId(60) })).rec) { console.error('FAIL 跨版本指紋應拒絕'); process.exit(1); }
  if (!checkRecord('壞掉').error || !checkRecord('{"app":"ask5-mbti","mode":12,"answers":{}}').error) { console.error('FAIL 無效檔應有錯誤訊息'); process.exit(1); }

  // 配對頁載入:依作答重算類型,不採用檔案裡的 type
  const lied = typeFromRecord(JSON.stringify({ ...rec, type: 'ESFP' }));
  if (lied.type !== 'INTJ' || lied.name !== '甲') { console.error('FAIL 配對載入應重算類型', lied); process.exit(1); }
  const junk = typeFromRecord(JSON.stringify({ ...old, type: 'XXXX' }));
  if (junk.type !== 'INFP') { console.error('FAIL 配對載入應忽略無效 type', junk); process.exit(1); }
  if (typeFromRecord(JSON.stringify({ ...rec, qset: 'x' })).type) { console.error('FAIL 配對載入應拒絕指紋不符'); process.exit(1); }
  console.log('verify-mbti: 計分平衡/題庫指紋/配對載入 OK');
}
{
  // 認知功能觀察:兩個方向都成立時兩條都列出
  const kinds = (x, y) => buildMatchGuide({ type: x, name: '甲' }, { type: y, name: '乙' }).insights;
  const count = (x, y, k) => kinds(x, y).filter((i) => i.kind === k).length;
  if (count('INTJ', 'ENTJ', '相互欣賞') !== 2 || count('ENTJ', 'INTJ', '相互欣賞') !== 2) { console.error('FAIL INTJ×ENTJ 相互欣賞應雙向'); process.exit(1); }
  if (count('INTJ', 'ESTP', '吸引與摩擦') !== 2) { console.error('FAIL INTJ×ESTP 吸引與摩擦應雙向'); process.exit(1); }
  const ie = kinds('INTJ', 'ENTJ').filter((i) => i.kind === '相互欣賞').map((i) => i.text).join('|');
  if (!/甲最擅長的 Ni/.test(ie) || !/乙最擅長的 Te/.test(ie)) { console.error('FAIL 雙向內容', ie); process.exit(1); }
  // 只有單向成立時仍只有一條(INTJ×ESTJ:ESTJ 主導 Te 是 INTJ 的輔助,反向不成立)
  if (count('INTJ', 'ESTJ', '相互欣賞') !== 1) { console.error('FAIL 單向相互欣賞應只有一條'); process.exit(1); }
  for (const x of Object.keys(TYPES)) for (const y of Object.keys(TYPES)) {
    const ks = kinds(x, y).map((i) => i.kind + i.text);
    if (new Set(ks).size !== ks.length) { console.error('FAIL 重複觀察', x, y); process.exit(1); }
  }
  console.log('verify-mbti: 雙向認知功能觀察 OK');
}
