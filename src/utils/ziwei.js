/**
 * 紫微斗數運算與資料封裝模組 - 基於 iztro
 * 支援國曆/農曆轉換、傳統回字型十二宮佈局、生年四化與 AI 提示詞組裝
 */
import { astro } from 'iztro';

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
  hourIdx = 0,
  gender = '男',
  isLeapMonth = false,
}) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const h = parseInt(hourIdx, 10) || 0;
  const gen = gender === '女' ? '女' : '男';

  let result = null;
  const dateStr = `${y}-${m}-${d}`;

  if (calendarType === 'lunar') {
    result = astro.byLunar(dateStr, h, gen, isLeapMonth, true, 'zh-TW');
  } else {
    result = astro.bySolar(dateStr, h, gen, true, 'zh-TW');
  }

  // 將 12 宮位轉成以「地支」為 key 的 Map 便於快速查詢
  const palacesByBranch = {};
  result.palaces.forEach((palace) => {
    palacesByBranch[palace.earthlyBranch] = palace;
  });

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
    chineseDate: result.chineseDate, // 例如：乙亥年 甲申月 丙午日 甲午時
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

/**
 * 組裝紫微斗數 AI 深度解盤 Prompt
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

  return `您好，請以當代資深紫微斗數國學大師（融會三合派與飛星四化格局精華）的視角，為【${personName}】的紫微命盤進行全方位深度解析：

【命盤基本天盤格局】：
- 八字四柱：${chineseDate}
- 五行局數：${fiveElementsClass}
- 命主星：${soul} ｜ 身主星：${body}
- 生年四化分布：${mutagens.join('、') || '見各宮'}

【核心核心三方四正與婚姻宮星曜】：
1. 【命宮】（${corePalaces.soul?.earthlyBranch}）：${formatStars(corePalaces.soul)}
2. 【遷移宮】（${corePalaces.travel?.earthlyBranch}）：${formatStars(corePalaces.travel)}
3. 【財帛宮】（${corePalaces.wealth?.earthlyBranch}）：${formatStars(corePalaces.wealth)}
4. 【官祿宮】（${corePalaces.career?.earthlyBranch}）：${formatStars(corePalaces.career)}
5. 【夫妻宮】（${corePalaces.marriage?.earthlyBranch}）：${formatStars(corePalaces.marriage)}
6. 【身宮】：位於【${corePalaces.body?.name}】（${corePalaces.body?.earthlyBranch}），後天言行與下半生心念歸宿。

【請為命主提供極具深度、邏輯清晰、不打迷糊仗的五大維度詳解】：
一、【本命心性與格局大勢】：由命宮星曜、廟旺利陷與身宮解析命主的人格底層代碼、天賦氣場與潛在心靈弱點。
二、【事業天賦與職場致勝道】：官祿宮與三方星曜如何引導其事業賽道？適合領薪體制、專技自由業還是經商創業？
三、【一生財帛與聚財守庫】：財帛宮吉凶煞星與四化之影響，何種求財模式最聚氣？如何防範漏財破耗？
四、【情感婚戀與相處智慧】：夫妻宮主星與福德宮互動，命主的理想伴侶原型、感情盲點與長久維持的經營指引。
五、【大師指路‧開運修為箴言】：給予命主直擊內心的一段生命修為箴言。`;
}
