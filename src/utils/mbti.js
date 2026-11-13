import { QUESTIONS, DIMENSIONS, TYPES } from '../data/mbti.js';
import { DETAIL } from '../data/mbtiDetail.js';

/** 取得題目清單（附原始 id，便於存取答案） */
export function getQuestions(mode) {
  const all = QUESTIONS.map((q, id) => ({ ...q, id }));
  const list = mode === 12 ? all.filter((q) => q.s) : all;
  return list;
}

/** 做題順序：不同維度交錯，避免連續同一題型 */
export function interleave(list) {
  const buckets = { EI: [], SN: [], TF: [], JP: [] };
  list.forEach((q) => buckets[q.d].push(q));
  const out = [];
  const max = Math.max(...Object.values(buckets).map((b) => b.length));
  for (let i = 0; i < max; i++) for (const k of Object.keys(buckets)) if (buckets[k][i]) out.push(buckets[k][i]);
  return out;
}

/**
 * 計分。answers: { [questionId]: 1..5 }（5=非常同意）
 * 每維度回傳偏向 a/b 極的百分比（0~100），score 為 -1~1，正值偏 a 極。
 * 持平時依序取 I / N / F / P（標示 tie）。
 */
export function scoreMbti(answers, mode) {
  const qs = getQuestions(mode);
  const dims = {};
  for (const key of Object.keys(DIMENSIONS)) {
    const { a, b } = DIMENSIONS[key];
    let sum = 0;
    let max = 0;
    for (const q of qs.filter((x) => x.d === key)) {
      const v = answers[q.id];
      if (!v) continue;
      const w = (v - 3) / 2; // -1 ~ 1
      sum += q.p === a ? w : -w;
      max += 1;
    }
    const score = max ? sum / max : 0;
    const aPct = Math.round(50 + score * 50);
    const tie = aPct === 50;
    dims[key] = {
      a, b,
      aPct,
      bPct: 100 - aPct,
      letter: tie ? b : score > 0 ? a : b,
      tie,
      strength: Math.abs(aPct - 50) * 2, // 0~100 傾向強度
      answered: max,
    };
  }
  const type = Object.keys(DIMENSIONS).map((k) => dims[k].letter).join('');
  return { type, dims, info: TYPES[type] };
}

export function strengthLabel(s) {
  if (s < 12) return '幾乎持平';
  if (s < 35) return '輕微傾向';
  if (s < 60) return '中等傾向';
  return '明顯傾向';
}

// ---------------- 存檔（JSON 檔案，存到使用者本機；不使用瀏覽器儲存） ----------------
export function buildRecord({ name, mode, answers }) {
  const res = scoreMbti(answers, mode);
  return {
    app: 'ask5-mbti',
    version: 1,
    name: (name || '').trim() || '未命名',
    mode,
    date: new Date().toISOString(),
    type: res.type,
    percents: Object.fromEntries(Object.entries(res.dims).map(([k, d]) => [k, d.aPct])),
    answers,
  };
}

/** 驗證並還原從本機載入的 JSON；失敗回傳 null */
export function parseRecord(text) {
  try {
    const r = JSON.parse(text);
    if (r?.app !== 'ask5-mbti' || ![12, 60].includes(r.mode) || typeof r.answers !== 'object' || !r.answers) return null;
    const qs = getQuestions(r.mode);
    if (!qs.every((q) => r.answers[q.id] >= 1 && r.answers[q.id] <= 5)) return null;
    return { ...r, name: String(r.name || '未命名'), date: r.date || new Date().toISOString() };
  } catch {
    return null;
  }
}

/** 產生完整報告純文字（供複製/下載） */
export function buildReportText(rec) {
  const res = scoreMbti(rec.answers, rec.mode);
  const info = res.info;
  const lines = [];
  lines.push(`【MBTI 人格測驗報告】`);
  lines.push(`姓名:${rec.name}　版本:${rec.mode} 題　日期:${new Date(rec.date).toLocaleString('zh-TW')}`);
  lines.push(`類型:${res.type}　${info.name}(${info.group})`);
  lines.push('');
  for (const [k, d] of Object.entries(res.dims)) {
    const m = DIMENSIONS[k];
    lines.push(`${m.title}:${m.aName}(${d.a}) ${d.aPct}% ／ ${m.bName}(${d.b}) ${d.bPct}%　→ ${d.letter}(${strengthLabel(d.strength)})`);
  }
  lines.push('');
  const det = DETAIL[res.type];
  lines.push(`簡介:${info.summary}`);
  lines.push(`你是什麼樣的人:${det.portrait}`);
  lines.push(`溝通風格:${det.comm}`);
  lines.push(`工作中的你:${det.work}`);
  lines.push(`壓力下的你:${det.stress}`);
  lines.push(`你最需要:${det.needs}`);
  lines.push(`別人怎麼和你相處最舒服:${det.tips.join(';')}`);
  lines.push(`優勢:${info.strengths.join('、')}`);
  lines.push(`盲點:${info.weaknesses.join('、')}`);
  lines.push(`適合方向:${info.careers.join('、')}`);
  lines.push(`感情:${info.love}`);
  lines.push(`成長建議:${info.growth}`);
  lines.push(`認知功能:${info.fn.join(' > ')}`);
  lines.push('');
  lines.push('※ 本測驗僅供娛樂與自我探索,非官方 MBTI® 測評,亦非心理診斷。');
  return lines.join('\n');
}
