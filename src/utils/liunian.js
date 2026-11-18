/**
 * 流年批命（八字・子平法簡化）：把 analyzeBazi 算好的流年資料寫成逐年的白話批文。
 *
 * 判斷依據（全部是固定規則，說明頁逐條列出）：
 *   - 流年天干十神 → 當年外顯主題（傳統「天干主上半年」）；地支本氣十神 → 下半年／內在主題
 *   - 天干、地支五行是否為命局喜用／忌神 → 助力或阻力
 *   - 流年地支與原局四柱的沖、合、刑、害、破、半合、三合 → 被觸動的人事領域
 *   - 流年干支與日柱、年柱的伏吟、反吟、天干五合；值太歲
 *   - 流年所在大運的吉凶 → 整體基調（運為十年大環境，年為當年氣候）
 * 不含神煞、流月、流日、小運，也不處理從格、化格。
 */
import { analyzeBazi } from './bazi.js';
import { baziYearOf } from './lunar.js';
import { STEM_HE, STEM_CLASH, CLASH as BRANCH_CLASH } from '../data/constants.js';

const TONE_LABEL = { good: '助力', mid: '平', bad: '阻力' };

/** 十神主題：title 為一句話標題，text 為白話說明 */
const TEN_THEME = {
  比肩: { title: '自我與同儕', text: '自主意識變強，適合獨立作業、與朋友同儕並肩合作；也容易各持己見，與人分利、分工時要先講清楚。' },
  劫財: { title: '競爭與人脈', text: '社交活躍、競爭者變多，花費、借貸、合夥分利的情況增加；錢財宜守不宜借，合作先立規則。' },
  食神: { title: '才華與享受', text: '表達、創作、口福與休閒運較好，心情放鬆，適合發揮專長、經營副業或作品。' },
  傷官: { title: '突破與表現', text: '想法多、想打破框架，有利技術、創意與個人品牌；言語容易太直，與上司、規範之間易起摩擦。' },
  偏財: { title: '機會與流動財', text: '人脈、業務與投資機會增加，財來得快去得也快；適合拓展，但不宜押重注。' },
  正財: { title: '穩定收入與務實', text: '重視收入、預算與責任，適合踏實累積、整理財務；以本業與勤勉換取成果。' },
  七殺: { title: '壓力與挑戰', text: '責任加重、競爭與壓力變大，同時也是被看見、升遷與磨練的機會；留意過勞。' },
  正官: { title: '名分與規範', text: '重規矩、考核、職位與名聲，利升遷、考試、制度內發展；做事宜按部就班。' },
  偏印: { title: '思考與轉向', text: '利研究、偏門技藝、心靈探索，獨處需求升高；易多慮或計畫臨時變卦，宜先想清楚再動。' },
  正印: { title: '學習與貴人', text: '利進修、證照、文書與房產事務，長輩與貴人較願意幫忙，心境安定；行動力可能偏慢。' },
};

/** 十神 → 生活面向的提示（事業、財運、感情、身心） */
const GROUP = { 比肩: '比劫', 劫財: '比劫', 食神: '食傷', 傷官: '食傷', 偏財: '財', 正財: '財', 七殺: '官殺', 正官: '官殺', 偏印: '印', 正印: '印' };
const DOMAIN = {
  比劫: { career: '適合合夥、團隊作戰或自行創業的評估，但要防同業競爭。', wealth: '開銷與人情支出變多，避免替人作保或大額借貸。' },
  食傷: { career: '適合展現專業與創意、轉換跑道或發展副業。', wealth: '靠技術、作品、口才生財的機會增加。' },
  財: { career: '業績與成果導向，努力容易換成實際報酬。', wealth: '財運活躍，宜開源也要記帳控管。' },
  官殺: { career: '職位、責任或考核有變化，利爭取升遷與正式頭銜。', wealth: '收入多與職責綁定，壓力大時避免衝動消費。' },
  印: { career: '利進修、考證、內部調整與累積實力，不急著大動。', wealth: '財運平穩，適合處理房產、保險、契約等長期事務。' },
};

const PILLAR_AREA = {
  年柱: '長輩、家族與大環境',
  月柱: '工作環境、父母兄弟與事業平台',
  日柱: '自己、配偶與居所',
  時柱: '子女、部屬與計畫成果',
};
const ACT_MEANING = {
  沖: '有變動、搬遷或轉換的可能，這個領域起伏較大',
  合: '牽絆加深，容易有新的合作或緣分，但也可能被事情綁住',
  刑: '容易有摩擦、是非、文書或小病小痛，凡事多一分謹慎',
  害: '留意暗中的耗損、誤會與小人',
  破: '計畫容易中途變卦或有小破損',
  自刑: '容易自己給自己壓力、反覆糾結',
};

const POSTURE = {
  積極: '運年同旺，宜積極進取，把握機會擴張。',
  穩進: '整體有助力，但有一方拖著，宜穩中求進、量力而為。',
  平穩: '起伏不大，宜按部就班、做好本分。',
  保守: '阻力較多，宜守不宜攻，重健康、現金流與人際分寸。',
};

/** 解析 branchInteractions 產生的旗標字串 */
function parseFlags(flags) {
  const acts = []; const combos = [];
  for (const f of flags) {
    const m = f.match(/^(自刑|沖|合|刑|害|破)(年柱|月柱|日柱|時柱)（(.)）$/);
    if (m) { acts.push({ kind: m[1], pos: m[2], b: m[3] }); continue; }
    const h = f.match(/半合(.)局$/);
    if (h) { combos.push({ kind: '半合', wx: h[1], text: f }); continue; }
    const s = f.match(/^三合(.)局$/);
    if (s) combos.push({ kind: '三合', wx: s[1], text: f });
  }
  return { acts, combos };
}

function postureOf(yearTone, luckTone) {
  const v = { good: 1, mid: 0, bad: -1 };
  const s = v[yearTone] + (luckTone ? v[luckTone] : 0);
  if (yearTone === 'good' && luckTone === 'good') return '積極';
  if (s >= 1) return '穩進';
  if (s <= -1) return '保守';
  return '平穩';
}

/**
 * @param {Object} profile computeFullProfile 的結果（需 destiny.pillarsRaw、moment.utc、gender）
 * @param {Object} opts { yearCount=10, now?:Date }
 */
export function buildLiunianReading(profile, opts = {}) {
  const gender = profile.gender === '女' ? '女' : '男';
  const utc = profile.moment?.utc;
  const bazi = analyzeBazi(profile.destiny.pillarsRaw, { gender, utc, now: opts.now, yearCount: opts.yearCount || 10 });
  const dm = bazi.dayMaster.stem;
  const dayP = bazi.pillars.find((p) => p.pos === '日柱');
  const yearP = bazi.pillars.find((p) => p.pos === '年柱');
  // 虛歲以農曆年計（出生即一歲、過春節加一歲）；流年本身仍以立春換年
  const birthYear = profile.destiny?.lunar?.year || (utc instanceof Date ? baziYearOf(utc) : null);
  const fav = new Set(bazi.yongshen.favorable);
  const unfav = new Set(bazi.yongshen.unfavorable);
  const romanceGroup = gender === '男' ? '財' : '官殺';
  const spouseStar = gender === '男' ? '財星' : '官殺星';
  const nowTs = (opts.now instanceof Date ? opts.now : new Date()).getTime();

  const years = bazi.years.map((y) => {
    const [ys, yb] = [y.gz[0], y.gz[1]];
    const luck = bazi.luck?.cycles.find((c) => y.year >= c.yearFrom && y.year <= c.yearTo) || null;
    const posture = postureOf(y.tone, luck?.tone);
    const { acts, combos } = parseFlags(y.flags);
    const stemT = TEN_THEME[y.stemTen];
    const branchT = TEN_THEME[y.branchTen];
    const reasons = [];
    const cautions = [];

    // 上半年：天干；下半年：地支
    const stemFeel = y.stemTone > 0 ? '屬喜用，順勢發揮' : y.stemTone < 0 ? '屬忌神，量力而為' : '不偏喜忌，平常心看待';
    const branchFeel = y.branchTone >= 0.4 ? '偏喜用，後勁較足' : y.branchTone <= -0.4 ? '偏忌神，壓力漸增' : '喜忌參半';
    reasons.push(`天干 ${ys}（${y.stemWx}）為${y.stemTen}，${stemFeel}。`);
    reasons.push(`地支 ${yb}（${y.branchWx}）本氣為${y.branchTen}，${branchFeel}。`);
    // analyzeBazi 的規則：地支沖刑害破原局時，「助力」降為「平」
    const hurt = acts.filter((a) => ['沖', '刑', '害', '破', '自刑'].includes(a.kind));
    if (y.tone === 'mid' && y.stemTone + y.branchTone >= 0.6 && hurt.length) {
      reasons.push(`喜忌本屬助力，但流年地支${hurt.map((a) => `${a.kind}${a.pos}`).join('、')}，降為「平」。`);
    }

    // 地支與原局的刑沖合害
    const touched = acts.map((a) => `${a.kind}${a.pos}：${PILLAR_AREA[a.pos]}方面${ACT_MEANING[a.kind]}。`);
    for (const c of combos) {
      const tag = fav.has(c.wx) ? '為喜用，助力加強' : unfav.has(c.wx) ? '為忌神，壓力加重' : '影響中性';
      touched.push(`${c.text}：${c.wx}的力量被帶動，${tag}。`);
    }

    // 伏吟、反吟、天干合日主、值太歲
    const specials = [];
    if (dayP && !dayP.empty) {
      if (ys === dayP.stem && yb === dayP.branch) specials.push('與日柱伏吟（干支相同）：同樣的課題重複出現，易覺停滯或舊事重提，宜沉住氣。');
      if (STEM_CLASH[ys] === dayP.stem && BRANCH_CLASH[yb] === dayP.branch) specials.push('與日柱反吟（天剋地沖）：自身與婚姻、居所變動較大，重大決定宜多方評估。');
      if (STEM_HE[ys] === dm) specials.push(`流年天干${ys}與日主${dm}五合：容易有人主動靠近、談合作或緣分。`);
    }
    if (yearP && !yearP.empty) {
      if (yb === yearP.branch) specials.push(`值太歲（流年地支同生年地支${yb}）：民俗所稱「本命年」，宜低調穩健。`);
      if (ys === yearP.stem && yb === yearP.branch) specials.push('與年柱伏吟：家族、長輩相關的事情重複浮現。');
      if (STEM_CLASH[ys] === yearP.stem && BRANCH_CLASH[yb] === yearP.branch) specials.push('與年柱反吟：家庭與大環境變動較明顯。');
    }

    // 生活面向
    const groups = [...new Set([GROUP[y.stemTen], GROUP[y.branchTen]])];
    const career = groups.map((g) => DOMAIN[g].career);
    const wealth = groups.map((g) => DOMAIN[g].wealth);
    const love = [];
    if (groups.includes(romanceGroup)) love.push(`流年出現${spouseStar}（${gender}命的異性緣星），感情議題被點亮：單身者較有機會，已婚者重視經營。`);
    const dayAct = acts.filter((a) => a.pos === '日柱');
    if (dayAct.some((a) => a.kind === '沖')) love.push('流年沖日支（夫妻宮）：感情或同居生活易有變動、分隔兩地或需要重新磨合。');
    if (dayAct.some((a) => a.kind === '合')) love.push('流年合日支（夫妻宮）：關係容易更緊密，利穩定、同居或婚事。');
    if (dayAct.some((a) => ['刑', '害', '破'].includes(a.kind))) love.push('夫妻宮受刑害破：小摩擦多，宜多溝通、少翻舊帳。');
    if (y.stemTen === '傷官' && gender === '女') love.push('女命傷官年：對伴侶要求變高、言語較銳利，注意說話方式。');
    if (y.stemTen === '劫財' && gender === '男') love.push('男命劫財年：留意第三者競爭或為感情破費。');
    if (!love.length) love.push('感情面沒有特別被觸動，維持平常的相處節奏即可。');
    const health = [];
    if (acts.some((a) => ['沖', '刑'].includes(a.kind))) health.push('有沖刑：留意交通、運動傷害與作息，避免冒險行為。');
    if (y.tone === 'bad') health.push('忌神當令之年：身心較易疲累，宜規律運動、早睡。');
    if (y.stemTen === '七殺' || y.branchTen === '七殺') health.push('七殺年壓力大：注意情緒出口與睡眠。');
    if (!health.length) health.push('身心大致平穩，保持規律作息即可。');

    // 宜／忌
    const doList = [];
    if (posture === '積極' || posture === '穩進') doList.push('爭取機會、推進計畫');
    if (['食傷'].includes(GROUP[y.stemTen])) doList.push('發揮專長、創作或副業');
    if (['印'].includes(GROUP[y.stemTen])) doList.push('進修、考證、處理文書契約');
    if (['財'].includes(GROUP[y.stemTen])) doList.push('開源、整理財務');
    if (['官殺'].includes(GROUP[y.stemTen])) doList.push('爭取職位、建立信用');
    if (['比劫'].includes(GROUP[y.stemTen])) doList.push('團隊合作、拓展人脈');
    if (posture === '保守' || posture === '平穩') doList.push('穩住本業、累積實力');
    if (y.stemTone < 0 || y.branchTone <= -0.4) cautions.push('大額投資或擴張');
    if (acts.some((a) => a.kind === '沖')) cautions.push('衝動搬遷、換工作前未做功課');
    if (['比劫'].includes(GROUP[y.stemTen])) cautions.push('替人作保、借貸');
    if (y.stemTen === '傷官') cautions.push('與上司或權威正面衝突');
    if (acts.some((a) => ['刑', '害'].includes(a.kind))) cautions.push('口舌是非、簽約不看細節');

    const age = birthYear ? y.year - birthYear + 1 : null;
    const summary = `${stemT.title}（上半年）・${branchT.title}（下半年）。${POSTURE[posture]}`;
    return {
      year: y.year, gz: y.gz, age, tone: y.tone, toneLabel: TONE_LABEL[y.tone], posture,
      stemTen: y.stemTen, branchTen: y.branchTen, stemTheme: stemT, branchTheme: branchT,
      luck: luck ? { gz: luck.gz, tone: luck.tone, toneLabel: TONE_LABEL[luck.tone], yearFrom: luck.yearFrom, yearTo: luck.yearTo } : null,
      summary, reasons, touched, specials,
      domains: { career, wealth, love, health },
      do: [...new Set(doList)], avoid: [...new Set(cautions)],
      flags: y.flags,
      current: y.year === bazi.years[0].year,
    };
  });

  const curLuck = bazi.luck?.cycles.find((c) => c.current) || null;
  const nextLuck = curLuck ? bazi.luck.cycles[bazi.luck.cycles.indexOf(curLuck) + 1] : null;
  const notes = [
    '流年以立春換年；天干主上半年、地支主下半年為傳統簡化說法，實際應整年合看。',
    '吉凶依據為命局喜忌（扶抑法）與地支刑沖合害，未計神煞、流月、流日與小運；不處理從格、化格。',
    ...bazi.notes.filter((n) => /時辰不詳|從格|節令/.test(n)),
  ];
  return {
    bazi, years, notes,
    luck: bazi.luck ? {
      direction: bazi.luck.direction, note: bazi.luck.note,
      current: curLuck ? { ...curLuck, toneLabel: TONE_LABEL[curLuck.tone] } : null,
      next: nextLuck ? { ...nextLuck, toneLabel: TONE_LABEL[nextLuck.tone] } : null,
      // 下次交運還剩多久（月）
      monthsToNext: nextLuck ? Math.max(0, Math.round((nextLuck.fromDate.getTime() - nowTs) / (30.44 * 86400000))) : null,
    } : null,
  };
}

/** 給 AI 的流年批命提示詞 */
export function generateLiunianPrompt(profile, reading, baziText) {
  const r = reading;
  const L = r.luck;
  const lines = r.years.map((y) => `- ${y.year} ${y.gz}${y.age ? `（虛歲 ${y.age}）` : ''}：天干${y.stemTen}／地支${y.branchTen}；流年${y.toneLabel}${y.luck ? `，所在大運 ${y.luck.gz}（${y.luck.toneLabel}）` : ''}；基調「${y.posture}」${y.flags.length ? `；與原局：${y.flags.join('、')}` : ''}${y.specials.length ? `；特殊：${y.specials.map((s) => s.split('：')[0]).join('、')}` : ''}`);
  return `請為命主【${profile.name}】（${profile.gender}）做「八字流年批命」，以下為系統已算好的資料，請據此論述，不要自行另起用神或杜撰神煞、流月：

【八字論命（子平扶抑法・簡化）】
${baziText}

【大運】
${L?.current ? `目前大運 ${L.current.gz}（${L.current.stemTen}/${L.current.branchTen}，${L.current.yearFrom}–${L.current.yearTo}，${L.current.toneLabel}）` : '大運資料不足'}${L?.next ? `；下一步大運 ${L.next.gz}（${L.next.toneLabel}），約 ${L.monthsToNext} 個月後交運` : ''}

【流年逐年資料（系統規則判定）】
${lines.join('\n')}

請依序撰寫：
1. 【大運總基調】目前這步大運的十年主題，以及與下一步大運的銜接。
2. 【今年詳批】${r.years[0].year} 年的事業、財運、感情、健康，各給具體建議，並說明上半年與下半年的差異。
3. 【未來逐年重點】其餘每一年用三到五句話點出主題、機會與提醒。
4. 【關鍵年份】指出最值得把握與最需要保守的年份各一到兩個，說明原因。
5. 【行動建議】給三條可以馬上開始做的事。
請註明這些是傾向而非定論，不恐嚇、不對醫療投資法律作保證。`;
}
