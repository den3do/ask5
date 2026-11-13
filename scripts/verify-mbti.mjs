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
