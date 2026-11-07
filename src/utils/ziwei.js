/**
 * 紫微斗數運算與資料封裝模組 - 基於 iztro
 * 支援國曆/農曆轉換、傳統回字型十二宮佈局、生年四化與 AI 提示詞組裝
 */
import { astro } from 'iztro';
import { solarToLunar, lunarYearOf } from './lunar.js';

// 傳統十二宮盤 4x4 網格的地支固定對應位置 (行 0~3, 列 0~3)
export const ZIWEI_GRID_LAYOUT = [
  // Row 0 (頂部：巳、午、未、申)
  { branch: '巳', row: 0, col: 0 },
  { branch: '午', row: 0, col: 1 },
  { branch: '未', row: 0, col: 2 },
  { branch: '申', row: 0, col: 3 },
  // Row 1 (中上：辰、中堂天盤、酉)
  { branch: '辰', row: 1, col: 0 },
  { branch: '酉', row: 1, col: 3 },
  // Row 2 (中下：卯、中堂天盤、戌)
  { branch: '卯', row: 2, col: 0 },
  { branch: '戌', row: 2, col: 3 },
  // Row 3 (底部：寅、丑、子、亥)
  { branch: '寅', row: 3, col: 0 },
  { branch: '丑', row: 3, col: 1 },
  { branch: '子', row: 3, col: 2 },
  { branch: '亥', row: 3, col: 3 },
];

/**
 * 計算紫微斗數命盤
 * @param {Object} params
 * @param {string} params.calendarType - 'solar' | 'lunar'
 * @param {number|string} params.year
 * @param {number|string} params.month
 * @param {number|string} params.day
 * @param {number|string} params.hourIdx - 0(子)~11(亥)
 * @param {string} params.gender - '男' | '女'
 * @param {boolean} [params.isLeapMonth=false] - 是否為農曆閏月
 */
export function calculateZiweiAstrolabe({
  calendarType = 'solar',
  year,
  month,
  day,
  hourIdx,
  gender = '男',
  isLeapMonth = false,
  pillarsText = '', // 本專案以真節氣算出的四柱；提供時取代 iztro 內建的四柱字串
}) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  // 時辰是紫微命宮的決定因素：缺漏時不可靜默當成子時
  const h = parseInt(hourIdx, 10);
  if (hourIdx === '' || hourIdx === null || hourIdx === undefined || Number.isNaN(h) || h < 0 || h > 11) {
    throw new Error('紫微斗數必須提供出生時辰（時辰決定命宮與全盤）；未知時辰無法排盤。');
  }
  const gen = gender === '女' ? '女' : '男';

  // 全站統一曆法：一律以本專案萬年曆換算農曆，再交給 iztro 以農曆排盤，
  // 不使用 iztro 內建的陽曆轉農曆，避免與其他系統日期不一致。
  let ly = y; let lm = m; let ld = d; let leap = !!isLeapMonth;
  if (calendarType !== 'lunar') {
    const l = solarToLunar(y, m, d);
    ly = l.lunarYear; lm = l.lunarMonth; ld = l.lunarDay; leap = l.isLeap;
  }
  // fixLeap=true：閏月十五日後視為下月（紫微常見派別之一）
  const result = astro.byLunar(`${ly}-${lm}-${ld}`, h, gen, leap, true, 'zh-TW');

  // 將 12 宮位轉成以「地支」為 key 的 Map 便於快速查詢
  const palacesByBranch = {};
  result.palaces.forEach((palace) => {
    palacesByBranch[palace.earthlyBranch] = palace;
  });

  // 年界一致性：紫微以「春節」換年（生年四化用農曆年干），八字年柱以「立春」換年；
  // 立春～春節之間出生者兩者年干會不同，必須明講，不能並列後假裝一致。
  let yearNote = null;
  const pillarYear = (pillarsText || '').trim().slice(0, 2);
  const ziweiYearStem = STEMS_ZW[(((ly - 4) % 10) + 10) % 10];
  if (pillarYear && pillarYear[0] !== ziweiYearStem) {
    yearNote = `八字年柱（立春換年）為「${pillarYear}」，但紫微以農曆正月初一換年，生年四化採「${ziweiYearStem}」干。兩者差一年屬流派差異，本盤紫微部分以春節為界。`;
  }

  // 命宮與身宮
  // 注意：iztro 的 isOriginalPalace 是「來因宮」，不是命宮，不可用來判斷命宮
  const soulPalace = result.palaces.find((p) => p.name === '命宮');
  const bodyPalace = result.palaces.find((p) => p.isBodyPalace);

  // 關鍵三方四正宮位 (命、財、官、遷)
  // iztro 繁中宮名為「財帛／官祿／遷移／夫妻」（無「宮」字），僅命宮帶宮字，故兩種寫法都比對
  const findPalace = (n) => result.palaces.find((p) => p.name === n || p.name === n + '宮');
  const wealthPalace = findPalace('財帛');
  const careerPalace = findPalace('官祿');
  const travelPalace = findPalace('遷移');
  const marriagePalace = findPalace('夫妻');

  return {
    raw: result,
    solarDate: result.solarDate,
    lunarDate: result.lunarDate,
    yearNote,
    ziweiYearStem,
    birthYear: parseInt(String(result.solarDate).split('-')[0], 10) || y,
    lunarYear: ly, // 虛歲與流年一律以農曆年（正月初一換年）計
    chineseDate: pillarsText || result.chineseDate, // 例如：乙亥年 甲申月 丙午日 甲午時
    fiveElementsClass: result.fiveElementsClass, // 五行局，如：金四局
    soul: result.soul, // 命主星
    body: result.body, // 身主星
    earthlyBranchOfSoulPalace: result.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: result.earthlyBranchOfBodyPalace,
    palaces: result.palaces,
    palacesByBranch,
    corePalaces: {
      soul: soulPalace,
      body: bodyPalace,
      wealth: wealthPalace,
      career: careerPalace,
      travel: travelPalace,
      marriage: marriagePalace,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 三方四正、大限四化、流年（紫微論吉凶的基礎資料）
// ─────────────────────────────────────────────────────────────────────────────
const STEMS_ZW = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BR_ZW = '子丑寅卯辰巳午未申酉戌亥';

/** 十天干四化（祿權科忌）；與 iztro 生年四化表一致 */
export const ZW_SIHUA = {
  甲: ['廉貞', '破軍', '武曲', '太陽'], 乙: ['天機', '天梁', '紫微', '太陰'],
  丙: ['天同', '天機', '文昌', '廉貞'], 丁: ['太陰', '天同', '天機', '巨門'],
  戊: ['貪狼', '太陰', '右弼', '天機'], 己: ['武曲', '貪狼', '天梁', '文曲'],
  庚: ['太陽', '武曲', '太陰', '天同'], 辛: ['巨門', '太陽', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左輔', '武曲'], 癸: ['破軍', '巨門', '太陰', '貪狼'],
};
const SIHUA_TYPES = ['祿', '權', '科', '忌'];

/** 三方四正：本宮、對宮（+6）、兩個三合宮（+4、+8） */
export function sanFangPalaces(palaces, p) {
  if (!p) return null;
  const i = BR_ZW.indexOf(p.earthlyBranch);
  const at = (k) => palaces.find((x) => x.earthlyBranch === BR_ZW[(i + k) % 12]);
  return { self: p, opposite: at(6), trine: [at(4), at(8)].filter(Boolean) };
}

/** target 相對 base 的位置：本宮／對宮／三合／他宮 */
export function palaceRelation(base, target) {
  if (!base || !target) return '他宮';
  const d = (BR_ZW.indexOf(target.earthlyBranch) - BR_ZW.indexOf(base.earthlyBranch) + 12) % 12;
  if (d === 0) return '本宮';
  if (d === 6) return '對宮';
  if (d === 4 || d === 8) return '三合';
  return '他宮';
}

/** 某天干的四化飛入本命盤哪些宮 */
export function mutagenLanding(palaces, stem) {
  const names = ZW_SIHUA[stem];
  if (!names) return [];
  return names.map((star, k) => {
    const palace = palaces.find((p) => [...p.majorStars, ...p.minorStars].some((s) => s.name === star));
    return { type: SIHUA_TYPES[k], star, palace };
  });
}

/** 十二個大限：每個大限的宮位、天干、四化落點與三方四正關係 */
export function analyzeDecadals(z, nowYear = lunarYearOf()) {
  const palaces = z.palaces;
  // 虛歲：出生即 1 歲、每逢農曆新年加 1 歲 → 以「農曆年」相減（nowYear 亦須為農曆年）
  const nominal = nowYear - (z.lunarYear || z.birthYear || nowYear) + 1;
  return palaces
    .map((p) => ({ p, range: p.decadal.range, stem: p.decadal.heavenlyStem }))
    .sort((a, b) => a.range[0] - b.range[0])
    .filter((d) => d.range[0] < 100)
    .map(({ p, range, stem }) => ({
      palace: p, range, stem,
      sanFang: sanFangPalaces(palaces, p),
      landings: mutagenLanding(palaces, stem).map((l) => ({ ...l, rel: palaceRelation(p, l.palace) })),
      current: nominal >= range[0] && nominal <= range[1],
    }));
}

/** 流年：流年命宮疊本命何宮、流年天干四化落點 */
export function analyzeYear(z, year) {
  const palaces = z.palaces;
  const idx = (((year - 4) % 60) + 60) % 60;
  const stem = STEMS_ZW[idx % 10];
  const branch = BR_ZW[idx % 12];
  const palace = palaces.find((p) => p.earthlyBranch === branch);
  return {
    year, stem, branch, palace,
    sanFang: sanFangPalaces(palaces, palace),
    landings: mutagenLanding(palaces, stem).map((l) => ({ ...l, rel: palaceRelation(palace, l.palace) })),
  };
}

const starText = (s) => `${s.name}${s.brightness ? `[${s.brightness}]` : ''}${s.mutagen ? `(化${s.mutagen})` : ''}`;
const palaceStars = (p) => {
  if (!p) return '—';
  const m = p.majorStars.map(starText).join('、') || '無主星';
  const n = p.minorStars.map((s) => `${s.name}${s.mutagen ? `(化${s.mutagen})` : ''}`).join('、');
  return `${m}${n ? `｜${n}` : ''}`;
};
const landingText = (ls) => ls.map((l) => `${l.star}化${l.type}→${l.palace ? `${l.palace.name}（${l.rel}）` : '不入盤'}`).join('、');

/**
 * 組裝紫微斗數 AI 深度解盤 Prompt
 * 提供：十二宮全部星曜、命宮三方四正、大限四化、流年四化；不再宣稱未提供的資料（如飛星全盤）
 */
export function generateZiweiAiPrompt(astrolabeData, personName = '命主') {
  if (!astrolabeData) return '';

  const {
    chineseDate,
    fiveElementsClass,
    soul,
    body,
    corePalaces,
    raw,
  } = astrolabeData;

  const formatStars = (palace) => {
    if (!palace) return '無主星（借對宮）';
    const majors = palace.majorStars.map((s) => `${s.name}${s.brightness ? `[${s.brightness}]` : ''}${s.mutagen ? `(${s.mutagen})` : ''}`);
    const minors = palace.minorStars.map((s) => `${s.name}${s.mutagen ? `(${s.mutagen})` : ''}`);
    return `主星：[${majors.join('、') || '無主星'}] ｜ 輔煞星：[${minors.join('、') || '無'}]`;
  };

  // 生年四化統計
  const mutagens = [];
  raw.palaces.forEach((p) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      if (s.mutagen) {
        mutagens.push(`${s.name}化${s.mutagen}（在${p.name}-${p.earthlyBranch}）`);
      }
    });
  });

  const nowYear = lunarYearOf(); // 紫微流年以農曆年（春節）換界
  const soulP = corePalaces.soul;
  const sf = sanFangPalaces(raw.palaces, soulP);
  const decadals = analyzeDecadals(astrolabeData, nowYear);
  const curDec = decadals.find((d) => d.current);
  const yearsInfo = [nowYear, nowYear + 1].map((y) => analyzeYear(astrolabeData, y));
  const allPalaces = raw.palaces.map((p) => `${p.name}（${p.earthlyBranch}，${p.heavenlyStem}）：${palaceStars(p)}`).join('\n');
  const sfText = sf ? `本宮${soulP.earthlyBranch}：${palaceStars(sf.self)}\n對宮${sf.opposite?.name}：${palaceStars(sf.opposite)}\n三合：${sf.trine.map((t) => `${t.name}：${palaceStars(t)}`).join('；')}` : '';
  const decText = curDec
    ? `目前大限（虛歲 ${curDec.range[0]}–${curDec.range[1]}）走「${curDec.palace.name}」（${curDec.palace.earthlyBranch}宮，天干${curDec.stem}）；大限四化：${landingText(curDec.landings)}`
    : '';
  const yearText = yearsInfo.map((yi) => `${yi.year} 流年（${yi.stem}${yi.branch}）命宮疊本命「${yi.palace?.name}」；流年四化：${landingText(yi.landings)}`).join('\n');

  return `您好，請以當代資深紫微斗數國學大師（三合派＋四化論斷）的視角，為【${personName}】的紫微命盤進行深度解析。
注意：下列資料為系統排盤結果，請只根據資料論述；資料中沒有的（例如飛星全盤、流月）不要杜撰。

【命盤基本資料】：
- 四柱（供對照）：${chineseDate}
- 五行局數：${fiveElementsClass}
- 命主星：${soul} ｜ 身主星：${body}
- 生年四化分布：${mutagens.join('、') || '見各宮'}
${astrolabeData.yearNote ? `- ⚠ ${astrolabeData.yearNote}\n` : ''}
【十二宮全部星曜】：
${allPalaces}

【命宮三方四正（論斷必須合看，不可單宮定吉凶）】：
${sfText}

【運限】：
${decText}
${yearText}

【四正宮位與婚姻宮（摘要）】：
1. 【命宮】（${corePalaces.soul?.earthlyBranch}）：${formatStars(corePalaces.soul)}
2. 【遷移宮】（${corePalaces.travel?.earthlyBranch}）：${formatStars(corePalaces.travel)}
3. 【財帛宮】（${corePalaces.wealth?.earthlyBranch}）：${formatStars(corePalaces.wealth)}
4. 【官祿宮】（${corePalaces.career?.earthlyBranch}）：${formatStars(corePalaces.career)}
5. 【夫妻宮】（${corePalaces.marriage?.earthlyBranch}）：${formatStars(corePalaces.marriage)}
6. 【身宮】：位於【${corePalaces.body?.name}】（${corePalaces.body?.earthlyBranch}），後天言行與下半生心念歸宿。

【請為命主提供極具深度、邏輯清晰、結論附上依據宮位的六大維度詳解】：
一、【本命心性與格局大勢】：由命宮星曜、廟旺利陷與身宮解析命主的人格底層代碼、天賦氣場與潛在心靈弱點。
二、【事業天賦與職場致勝道】：官祿宮與三方星曜如何引導其事業賽道？適合領薪體制、專技自由業還是經商創業？
三、【一生財帛與聚財守庫】：財帛宮吉凶煞星與四化之影響，何種求財模式最聚氣？如何防範漏財破耗？
四、【情感婚戀與相處智慧】：夫妻宮主星與福德宮互動，命主的理想伴侶原型、感情盲點與長久維持的經營指引。
五、【運限提醒】：依目前大限四化與近兩年流年四化，說明事業、財帛、感情分別宜進宜守；請註明這是傾向而非定論。
六、【修為箴言】：給予命主一段務實的生活建議。`;
}
