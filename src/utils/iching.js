import { TRIGRAMS, GONG_DATA, HEXAGRAM_DATA, STEMS, BRANCHES, BRANCH_WUXING, WUXING_RELATION, NAJIA_TABLE } from '../data/constants.js';

// --- 地支刑沖合害 判斷邏輯 ---
export const checkBranchInteraction = (b1, b2) => {
  // 六沖
  const clashes = [['子','午'], ['丑','未'], ['寅','申'], ['卯','酉'], ['辰','戌'], ['巳','亥']];
  for (let pair of clashes) {
    if ((b1 === pair[0] && b2 === pair[1]) || (b1 === pair[1] && b2 === pair[0])) return '六沖';
  }
  
  // 六合
  const combines = [['子','丑'], ['寅','亥'], ['卯','戌'], ['辰','酉'], ['巳','申'], ['午','未']];
  for (let pair of combines) {
    if ((b1 === pair[0] && b2 === pair[1]) || (b1 === pair[1] && b2 === pair[0])) return '六合';
  }

  // 三刑
  const punishments = [
    { p: ['寅','巳'], type: '相刑' }, { p: ['巳','申'], type: '相刑' }, { p: ['申','寅'], type: '相刑' },
    { p: ['丑','戌'], type: '相刑' }, { p: ['戌','未'], type: '相刑' }, { p: ['未','丑'], type: '相刑' },
    { p: ['子','卯'], type: '無禮之刑' }
  ];
  for (let item of punishments) {
    if ((b1 === item.p[0] && b2 === item.p[1]) || (b1 === item.p[1] && b2 === item.p[0])) return item.type;
  }
  
  // 自刑
  if (b1 === b2 && ['辰','午','酉','亥'].includes(b1)) return '自刑';

  return null;
};

// 六親查找 (宮位五行為我，爻支五行為他)
export const getRelation = (meWuxing, otherWuxing) => {
  const interactions = {
    '金': { '金': '兄弟', '木': '妻財', '水': '子孫', '火': '官鬼', '土': '父母' },
    '木': { '金': '官鬼', '木': '兄弟', '水': '父母', '火': '子孫', '土': '妻財' },
    '水': { '金': '父母', '木': '子孫', '水': '兄弟', '火': '妻財', '土': '官鬼' },
    '火': { '金': '妻財', '木': '父母', '水': '官鬼', '火': '兄弟', '土': '子孫' },
    '土': { '金': '子孫', '木': '官鬼', '水': '妻財', '火': '父母', '土': '兄弟' }
  };
  return interactions[meWuxing]?.[otherWuxing] || '兄弟';
};

// 六獸起例 (以日干為基準)
export const getSixBeasts = (dayStem) => {
  const map = { '甲': 0, '乙': 0, '丙': 1, '丁': 1, '戊': 2, '己': 3, '庚': 4, '辛': 4, '壬': 5, '癸': 5 };
  const beasts = ['青龍', '朱雀', '勾陳', '螣蛇', '白虎', '玄武'];
  const startIdx = map[dayStem] ?? 0;
  const result = [];
  for (let i = 0; i < 6; i++) {
    result.push(beasts[(startIdx + i) % 6]);
  }
  return result;
};

// 尋找八宮所屬與世應
export const findPalaceAndShi = (uid, lid) => {
  const u = parseInt(uid, 10);
  const l = parseInt(lid, 10);
  for (const [palaceId, hexes] of Object.entries(GONG_DATA)) {
    for (const h of hexes) {
      if (h.u === u && h.l === l) {
        return { 
          palaceId: parseInt(palaceId, 10), 
          palaceWuxing: TRIGRAMS[palaceId].wuxing, 
          palaceName: TRIGRAMS[palaceId].name,
          shi: h.s,
          ying: (h.s + 3) > 6 ? (h.s + 3) - 6 : (h.s + 3)
        };
      }
    }
  }
  return { palaceId: 1, palaceWuxing: '金', palaceName: '乾', shi: 1, ying: 4 };
};

// 取得卦名與卦辭
export const getHexData = (u, l) => {
  const key = `${u}-${l}`;
  return HEXAGRAM_DATA[key] || { 
    name: `卦 (${u}-${l})`, 
    text: "亨通吉利，順應天時。", 
    vernacularText: "象徵順應造化，行事謹慎則吉。",
    lines: ["初爻吉。", "二爻利。", "三爻亨。", "四爻平。", "五爻尊。", "上爻慎。"] 
  };
};

// 五鼠遁日 (日干 -> 時干)
export const getHourStem = (dayStem, hourBranchIdx) => {
  const dayIdx = STEMS.indexOf(dayStem);
  if (dayIdx === -1) return '';
  const startStemIdx = ((dayIdx % 5) * 2) % 10;
  return STEMS[(startStemIdx + hourBranchIdx) % 10];
};

// 空亡計算 (根據日干支查旬空)
export const getKongWang = (dayStem, dayBranch) => {
  const sIdx = STEMS.indexOf(dayStem);
  const bIdx = BRANCHES.indexOf(dayBranch);
  if (sIdx === -1 || bIdx === -1) return [];
  const xunShouBranchIdx = (bIdx - sIdx + 12) % 12;
  const kw1 = BRANCHES[(xunShouBranchIdx + 10) % 12];
  const kw2 = BRANCHES[(xunShouBranchIdx + 11) % 12];
  return [kw1, kw2];
};

// 計算互卦 (取二三四爻為下互，三四五爻為上互)
export const findNuclearHexagram = (uId, lId) => {
  const uTrigram = TRIGRAMS[uId];
  const lTrigram = TRIGRAMS[lId];
  if (!uTrigram || !lTrigram) return { uId: 1, lId: 1, hex: getHexData(1, 1) };

  const getBits = (bin) => bin.split('').map(Number);
  const lBits = getBits(lTrigram.binary); // [top, mid, bot]
  const uBits = getBits(uTrigram.binary);

  // 爻順序 (1=初爻, 6=上爻)
  const lineMap = {
    1: lBits[2], 2: lBits[1], 3: lBits[0],
    4: uBits[2], 5: uBits[1], 6: uBits[0]
  };

  // 下互卦 (2, 3, 4爻) -> top:4, mid:3, bot:2
  const lowerNuclearBin = [lineMap[4], lineMap[3], lineMap[2]].join('');
  // 上互卦 (3, 4, 5爻) -> top:5, mid:4, bot:3
  const upperNuclearBin = [lineMap[5], lineMap[4], lineMap[3]].join('');

  const findId = (bin) => Object.keys(TRIGRAMS).find(k => TRIGRAMS[k].binary === bin);
  const nLId = parseInt(findId(lowerNuclearBin), 10);
  const nUId = parseInt(findId(upperNuclearBin), 10);

  return {
    uId: nUId,
    lId: nLId,
    uTrigram: TRIGRAMS[nUId],
    lTrigram: TRIGRAMS[nLId],
    hex: getHexData(nUId, nLId)
  };
};

// 五行旺相休囚死 (以月令地支為基準)
export const getWuxingWangShuai = (element, monthBranch) => {
  const monthWuxing = BRANCH_WUXING[monthBranch] || '木';
  
  if (element === monthWuxing) return { status: '旺', desc: '得令當旺，力量最強', score: 3 };
  
  // 月令生我為相 (例如木月火為相)
  const generates = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  if (generates[monthWuxing] === element) return { status: '相', desc: '月令生助，次旺有力', score: 2 };
  
  // 我生月令為休 (退休無力)
  if (generates[element] === monthWuxing) return { status: '休', desc: '生助月令，消耗體力', score: -1 };
  
  // 剋月令為死 (耗盡力量)
  const restrains = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  if (restrains[element] === monthWuxing) return { status: '死', desc: '受耗無力，施展困難', score: -3 };
  
  // 月令剋我為囚 (受制無奈)
  if (restrains[monthWuxing] === element) return { status: '囚', desc: '受月令壓制，窒礙難行', score: -2 };

  return { status: '平', desc: '平和無礙', score: 0 };
};

// 進神與退神判定
export const checkAdvanceOrRetreat = (b1, b2) => {
  const advancePairs = [['亥','子'], ['寅','卯'], ['巳','午'], ['申','酉'], ['丑','辰'], ['辰','未'], ['未','戌'], ['戌','丑']];
  const retreatPairs = [['子','亥'], ['卯','寅'], ['午','巳'], ['酉','申'], ['辰','丑'], ['未','辰'], ['戌','未'], ['丑','戌']];

  for (let pair of advancePairs) {
    if (b1 === pair[0] && b2 === pair[1]) return { type: '化進神', score: 3, desc: '氣勢持續增長，愈來愈順' };
  }
  for (let pair of retreatPairs) {
    if (b1 === pair[0] && b2 === pair[1]) return { type: '化退神', score: -3, desc: '後勁不足，恐有漸衰退步之兆' };
  }
  return null;
};

// 占問主題對應六親用神
export const getTopicYongShen = (topic, gender = '男') => {
  switch (topic) {
    case '財運':
    case '投資':
    case '生意':
      return { relation: '妻財', name: '妻財爻', field: '財利/回報' };
    case '事業':
    case '工作':
    case '升遷':
    case '官司':
      return { relation: '官鬼', name: '官鬼爻', field: '職位/權利/貴人' };
    case '感情':
    case '婚姻':
      return gender === '男' 
        ? { relation: '妻財', name: '妻財爻', field: '伴侶/對象' }
        : { relation: '官鬼', name: '官鬼爻', field: '伴侶/對象' };
    case '健康':
    case '長輩':
    case '學業':
    case '考運':
    case '文書':
    case '房子':
      return { relation: '父母', name: '父母爻', field: '文憑/生機/庇護' };
    case '子女':
    case '平安':
    case '解憂':
    case '醫藥':
      return { relation: '子孫', name: '子孫爻', field: '福星/解憂/快樂' };
    case '朋友':
    case '同儕':
    case '合夥':
    case '競爭':
      return { relation: '兄弟', name: '兄弟爻', field: '同伴/同儕/競爭對手' };
    default:
      return { relation: '妻財', name: '妻財爻', field: '所得/回饋' };
  }
};

/**
 * 【一事一占：吉凶判斷引擎演算法】
 * 根據用神、月建、日辰、動爻、世應評分，產出 7 等級與白話評語
 */
export const evaluateDivination = ({
  topic,
  pillars,
  linesData,
  movingLine,
  palaceWuxing,
  originalHex,
  changedHex,
  nuclearHex
}) => {
  const yongShenInfo = getTopicYongShen(topic);
  const targetRelation = yongShenInfo.relation;

  // 1. 抓出用神爻與世爻
  const shiLine = linesData.find(l => l.isShi);
  const yingLine = linesData.find(l => l.isYing);
  const movingLineData = linesData.find(l => l.isMoving);

  // 用神爻（若有多個取旺相或動者，若無則暫取世爻或相應位置）
  let yongShenLine = linesData.find(l => l.relation === targetRelation && l.isMoving) 
    || linesData.find(l => l.relation === targetRelation && l.isShi)
    || linesData.find(l => l.relation === targetRelation)
    || shiLine;

  let totalScore = 0;
  const reasons = [];
  const warnings = [];
  const strengths = [];

  // (1) 用神月建旺衰
  const ysMonthStatus = getWuxingWangShuai(yongShenLine.wuxing, pillars.monthBranch);
  totalScore += ysMonthStatus.score;
  if (ysMonthStatus.score > 0) {
    strengths.push(`用神【${yongShenInfo.name}】得月令(${pillars.monthBranch}月)${ysMonthStatus.status}氣，天時相挺，根基厚實`);
  } else if (ysMonthStatus.score < 0) {
    warnings.push(`用神【${yongShenInfo.name}】逢月令${ysMonthStatus.status}氣，外在環境施展受限`);
  }

  // (2) 用神日辰生剋與破散
  const dayBranchWuxing = BRANCH_WUXING[pillars.dayBranch];
  const ysDayRelation = WUXING_RELATION[dayBranchWuxing][yongShenLine.wuxing]; // 日建對用神
  if (ysDayRelation === '生') {
    totalScore += 2;
    strengths.push(`用神得日辰(${pillars.dayBranch})暗中相生，有暗中貴人相助`);
  } else if (ysDayRelation === '剋') {
    totalScore += -2;
    warnings.push(`用神遭日辰(${pillars.dayBranch})暗剋，行事容易受到突發性阻力`);
  } else if (ysDayRelation === '比和') {
    totalScore += 1;
    strengths.push(`用神與日辰同氣比和，辦事有力`);
  }

  // 月破判定
  const isYsYuePo = yongShenLine.branch === pillars.yuePoBranch;
  if (isYsYuePo) {
    totalScore -= 6;
    warnings.push(`用神逢【月破】(與月建六沖)，猶如枯木逢暴風，目前處於最被動虛弱之時`);
  }

  // 日破判定
  const isYsRiPo = yongShenLine.branch === pillars.riPoBranch && !yongShenLine.isMoving;
  if (isYsRiPo) {
    totalScore -= 3;
    warnings.push(`用神安靜受日沖為【日破】，主心浮氣躁或事有破敗`);
  }

  // 旬空判定
  if (yongShenLine.isKongWang) {
    totalScore -= 5;
    warnings.push(`用神【落空亡】，代表你所追求的事情目前空中樓閣，暫時如捕風捉影`);
  }

  // 世爻旬空
  if (shiLine.isKongWang) {
    totalScore -= 4;
    warnings.push(`世爻自己【落空亡】，表示你當下心無著落、猶豫不決，或自顧不暇有心無力`);
  }

  // (3) 世爻旺衰與用神關係
  const shiMonthStatus = getWuxingWangShuai(shiLine.wuxing, pillars.monthBranch);
  totalScore += Math.max(-2, Math.min(2, shiMonthStatus.score));

  // 用神與世爻生剋關係
  const ysToShiRelation = WUXING_RELATION[yongShenLine.wuxing][shiLine.wuxing]; // 用神對世爻
  if (shiLine.relation === targetRelation) {
    totalScore += 5;
    strengths.push(`【${yongShenInfo.name}持世】，求事在己，福氣主動歸於自身，大吉之兆！`);
  } else if (ysToShiRelation === '生') {
    totalScore += 4;
    strengths.push(`用神生世爻（求事生我），代表好處、成果主動送上門，得來輕鬆不費力`);
  } else if (ysToShiRelation === '剋') {
    totalScore -= 4;
    warnings.push(`用神剋世爻，代表求此事物反遭其累，壓力沉重，得不償失`);
  } else if (WUXING_RELATION[shiLine.wuxing][yongShenLine.wuxing] === '剋') {
    totalScore += 1;
    strengths.push(`世爻剋用神（我剋者為財/可駕馭），代表事情需親力親為、耗費一番心力方能克服`);
  } else if (WUXING_RELATION[shiLine.wuxing][yongShenLine.wuxing] === '生') {
    totalScore -= 2;
    warnings.push(`世爻生用神（我生他為洩氣），表示你單方面付出耗損極大，回報恐怕不如預期`);
  }

  // 世應關係
  const shiYingRelation = WUXING_RELATION[yingLine.wuxing][shiLine.wuxing];
  if (shiYingRelation === '生' || shiYingRelation === '比和') {
    totalScore += 1;
    strengths.push(`應爻(對方/客體)生扶世爻，人際配合度佳，容易獲得外界奧援`);
  } else if (shiYingRelation === '剋') {
    totalScore -= 2;
    warnings.push(`應爻剋世爻，外在人際或對手態度防備，需防背刺或合作破局`);
  }

  // (4) 動爻與動變反饋 (關鍵重頭戲)
  if (movingLineData && movingLineData.changed) {
    const cData = movingLineData.changed;
    const origBranch = movingLineData.branch;
    const chgBranch = cData.branch;
    const origWuxing = movingLineData.wuxing;
    const chgWuxing = cData.wuxing;

    // 回頭生 / 回頭剋
    const backRelation = WUXING_RELATION[chgWuxing][origWuxing];
    if (backRelation === '生') {
      totalScore += 5;
      strengths.push(`動爻發動【化回頭生】(${chgBranch}${chgWuxing}生${origBranch}${origWuxing})，後勁無窮，越往後發展越好！`);
    } else if (backRelation === '剋') {
      totalScore -= 6;
      warnings.push(`動爻發動遭【化回頭剋】(${chgBranch}${chgWuxing}剋${origBranch}${origWuxing})，先成後敗，過程需嚴防反撲與破壞！`);
    }

    // 進神 / 退神
    const advRet = checkAdvanceOrRetreat(origBranch, chgBranch);
    if (advRet) {
      totalScore += advRet.score;
      if (advRet.score > 0) strengths.push(`動爻【${advRet.type}】，${advRet.desc}`);
      else warnings.push(`動爻【${advRet.type}】，${advRet.desc}`);
    }

    // 動化空亡
    if (pillars.kongWang.includes(chgBranch)) {
      totalScore -= 3;
      warnings.push(`動爻【化入空亡】，代表變化之後力量消散，容易竹籃打水一場空`);
    }

    // 動爻對世爻/用神之作用
    const movToShi = WUXING_RELATION[origWuxing][shiLine.wuxing];
    const movToYs = WUXING_RELATION[origWuxing][yongShenLine.wuxing];

    if (movToShi === '生' && !movingLineData.isShi) {
      totalScore += 3;
      strengths.push(`動爻生扶世爻，事態發展過程中會出現意料之外的助力`);
    } else if (movToShi === '剋' && !movingLineData.isShi) {
      totalScore -= 4;
      warnings.push(`動爻剋傷世爻，中途容易殺出程咬金，令你措手不及`);
    }

    if (movToYs === '生' && yongShenLine !== movingLineData) {
      totalScore += 3;
      strengths.push(`動爻生扶用神，核心目標得到催化生發，推進有望`);
    } else if (movToYs === '剋' && yongShenLine !== movingLineData) {
      totalScore -= 4;
      warnings.push(`動爻剋害用神，求事核心受到波及干擾，需留意細節漏洞`);
    }
  }

  // 映射 7 個等級
  let level = '平';
  let badgeClass = 'bg-stone-500 text-white';
  let advice = '';

  if (totalScore >= 12) {
    level = '大吉';
    badgeClass = 'bg-emerald-600 text-white';
    advice = '天時地利人和皆具，此時正是乘風破浪之大好良機！請堅定目標、大步前行，必能大有收穫。';
  } else if (totalScore >= 7) {
    level = '吉';
    badgeClass = 'bg-green-600 text-white';
    advice = '卦氣流通有力，整體朝正面態勢進展。按部就班執行既定計畫，成功指日可待。';
  } else if (totalScore >= 2) {
    level = '小吉';
    badgeClass = 'bg-teal-600 text-white';
    advice = '雖有小成或微利，但過程仍有些許阻絆。建議沉住氣，一步一腳印，不可貪急躁進。';
  } else if (totalScore >= -1) {
    level = '平';
    badgeClass = 'bg-stone-500 text-white';
    advice = '形勢處於多空拉鋸或僵持階段，不宜過度冒進。宜養精蓄銳、暗中打底，靜候下一個轉折契機。';
  } else if (totalScore >= -5) {
    level = '小凶';
    badgeClass = 'bg-amber-600 text-white';
    advice = '阻力漸顯，容易有暗虧或無謂的耗損。建議保守觀望，檢視防範漏洞，勿因面子硬撐。';
  } else if (totalScore >= -10) {
    level = '凶';
    badgeClass = 'bg-orange-600 text-white';
    advice = '局勢受制嚴重，勞多獲少且易生波折。強求恐招損失，及時止損或暫退一步方為上策。';
  } else {
    level = '大凶';
    badgeClass = 'bg-rose-700 text-white';
    advice = '動靜皆困，防禦第一！此刻切忌進行重大決策或投資，宜修身守靜、尋求專業貴人庇護以避災殃。';
  }

  // 組合生動通順的白話文評語
  const commentaryParts = [
    `【斷語結論】：占問【${topic}】，全卦總結為【${level}】之象（綜合卦氣得分：${totalScore}分）。`,
    `【時局氣候】：${strengths.length > 0 ? strengths.join('；') + '。' : '目前時機平平，未見顯著外力加持。'}`,
    warnings.length > 0 ? `【風險警示】：${warnings.join('；')}。` : '【風險警示】：盤面未見重大沖煞剋害，外部阻力較輕。',
    `【應對錦囊】：${advice}`
  ];

  const fullCommentary = commentaryParts.join('\n\n');

  return {
    score: totalScore,
    level,
    badgeClass,
    strengths,
    warnings,
    advice,
    fullCommentary,
    yongShen: {
      name: yongShenInfo.name,
      relation: targetRelation,
      lineNum: yongShenLine.lineNum,
      branch: yongShenLine.branch,
      wuxing: yongShenLine.wuxing,
      status: ysMonthStatus.status
    }
  };
};

/**
 * 【個人終身卦：深度命理分析報告產生器】
 * 生成包含性格、天職事業、一生財運、人際感情、健康養生與開運錦囊的完整報告
 */
export const generateDestinyReport = ({
  birthdayStr,
  calendarType,
  hasHour,
  hourBranch,
  pillars,
  originalHex,
  nuclearHex,
  palaceInfo,
  linesData
}) => {
  const shiLine = linesData.find(l => l.isShi) || linesData[0];
  const yingLine = linesData.find(l => l.isYing) || linesData[3];
  const caiLines = linesData.filter(l => l.relation === '妻財');
  const guanLines = linesData.filter(l => l.relation === '官鬼');
  const ziSunLines = linesData.filter(l => l.relation === '子孫');
  const xiongDiLines = linesData.filter(l => l.relation === '兄弟');
  const fuMuLines = linesData.filter(l => l.relation === '父母');

  const shiWuxing = shiLine.wuxing;
  const shiRelation = shiLine.relation;
  const shiBeast = shiLine.beast;

  // 1. 性格與心性特質庫
  const wuxingPersonality = {
    '木': {
      title: '青木修竹型 ‧ 仁愛有志，剛直向上',
      desc: '性格敦厚仁慈，富同情心與理想抱負，富有生生不息的向上力。有文藝靈性與長遠眼光，但有時過於執著於原則，稍嫌固執倔強、寧折不彎。'
    },
    '火': {
      title: '朱雀烈火型 ‧ 熱情明亮，禮貌敏銳',
      desc: '心性坦率明朗，感情豐沛且思維敏捷，對周遭事物充滿熱情與洞察力。為人重禮節與體面，但耐性稍欠，情緒來得快去得也快，容易因直言不諱而惹是非。'
    },
    '土': {
      title: '后土大地型 ‧ 敦厚誠信，沉穩包容',
      desc: '為人篤實沉穩，信用第一，具備極強的包容力與責任感。做事腳踏實地、不浮誇，值得託付重任；缺點是性格略偏被動保守，思考周延但行動稍慢，有時過於認死理。'
    },
    '金': {
      title: '白虎精金型 ‧ 剛毅果斷，重情重義',
      desc: '行事乾淨俐落、意志堅決，具強烈正義感與是非觀念。為人仗義有擔當，天生帶有領袖威儀；但性格稜角分明、防衛心強，不易對外妥協，需注意言詞鋒芒傷人。'
    },
    '水': {
      title: '玄冥深水型 ‧ 聰慧機靈，善變通達',
      desc: '智商高超、思維靈動如流水，極具適應力與人情通達之智。善於察言觀色、迂迴成事；但偶爾心思過重、城府略深，心緒容易隨外在環境波動，缺乏長久定力。'
    }
  };

  const relationPersonality = {
    '子孫': '天生自帶福氣與幽默感，不喜拘束管轄，追求精神自由與天賦發揮。為人隨和親切，樂於付出照拂弱小，是眾人眼中的開心果與福將。',
    '官鬼': '戒律自律嚴謹，榮譽心與危機意識極強，心懷大局與權責擔當。做事深謀遠慮、步步為營，但常給自己過高壓迫感，神經長期緊繃。',
    '父母': '為人重文憑修養，傳統保守，具長者風範與慈愛之心。善於吸收知識、思考縝密、深居幕後；然而容易多愁善感、顧慮過多而錯失快節奏良機。',
    '妻財': '求實務實，對金錢數字與商業機會嗅覺敏銳，精打細算但不失大氣。善於整合資源與人脈，重視物質成果與生活品質，不喜空談虛幻之論。',
    '兄弟': '為人豪爽重情義，結交四方朋友，講究同甘共苦與團隊合作。自我主張強烈，爭勝心旺，容易為朋友兩肋插刀而承擔無謂代價。'
  };

  const beastPersonality = {
    '青龍': '氣質高雅清正，注重儀表品位，行事端正帶有貴人風範，受人尊敬。',
    '朱雀': '口才出眾、能言善辯，善於表達與傳播理念，但容易引發口舌爭辯。',
    '勾陳': '步步為營，極為守信用，穩重踏實，但也容易因遲疑保守而牽絆手腳。',
    '螣蛇': '靈覺驚人，第六感強烈，心思細膩縝密，然常多疑慮焦慮，容易患得患失。',
    '白虎': '果敢威猛，脾氣耿直硬氣，行動力極強，魄力過人但需修身養氣克制脾氣。',
    '玄武': '深藏不露，智謀多謀，善於暗中佈局策劃，靈活善藏，不易被外人看穿內心。'
  };

  // 2. 適合職業推薦
  const careerMapping = {
    '木': ['文教出版', '文化創意', '綠能環保', '林業園藝', '生技醫藥', '公關傳播', '教育培訓'],
    '火': ['人工智慧/資訊科技', '影視娛樂', '餐飲美食', '能源電力', '光學電子', '美學設計', '品牌行銷'],
    '土': ['不動產建築', '土地開發', '顧問諮詢', '倉儲物流', '農業生態', '礦產資源', '公務機構/中介'],
    '金': ['金融銀行', '證券投資', '精密製造', '軍警司法', '五金機械', '汽車工業', '外科醫療'],
    '水': ['跨國貿易', '航運物流', '水產冷鏈', '互聯網社交', '心理諮商', '酒水飲品', '旅遊觀光']
  };

  const careerRole = {
    '子孫': '【專技/文創/自由業定位】：適合靠才華、手藝、演繹、研發或顧問起家，不受傳統朝九晚五桎梏，適合個人工作室、合夥人或技術總監。',
    '官鬼': '【體制管理/企業高管定位】：天生適合置身於組織體系、大企業、公職司法或專案管理，能承擔權力責任，適合主管、領導或監管角色。',
    '父母': '【幕僚研究/學術教育定位】：適合企劃幕僚、學術研究、公文文書、教育傳承或專利版權等需深厚知識積累之領域，為團隊的智慧大腦。',
    '妻財': '【商務貿易/資本運作定位】：天生適合經商、市場銷售、採購商務、財務投資或供應鏈管理，直接與現金流及盈利成果接軌。',
    '兄弟': '【團隊合夥/開拓先鋒定位】：適合業務開拓、社群經營、體育競技、加盟連鎖或合夥創業，依靠團隊協作打江山。'
  };

  // 3. 一生財運格局
  let wealthSummary = '';
  if (shiRelation === '妻財') {
    wealthSummary = '【財爻持世 ‧ 命中帶財】：財氣主動依附於身，生來對金錢流通具備天然吸引力。若肯踏實經營，一生衣食無缺，正財偏財皆有所獲。防身弱不勝財，需重體魄與道德積累。';
  } else if (shiRelation === '子孫') {
    wealthSummary = '【子孫持世 ‧ 才華生財】：子孫乃財之源頭，代表靠專業才藝、創意或智慧源源不斷點石成金。不需投機取巧，憑借自身無可替代的技能即能享有富足人生。';
  } else if (shiRelation === '兄弟') {
    wealthSummary = '【兄弟持世 ‧ 守財需慎】：求財過程奔波辛苦，競爭激烈且容易因同儕、朋友合夥或借貸而破財漏財。建議養成強制儲蓄、購買不動產等固定資產鎖定財富，避免沾染投機賭博。';
  } else if (shiRelation === '官鬼') {
    wealthSummary = '【官鬼持世 ‧ 權祿相隨】：財富往往依附於職權、聲譽與地位而來，先求名後求利。需防因追求功名產生過大交際應酬或合規法律開銷，清廉正直則財路長久。';
  } else {
    wealthSummary = '【父母持世 ‧ 勤勞致富】：財運以穩定薪俸、版權、技術傳承與固定資產增值為主。求財需腳踏實地，年輕時多積累資歷學問，中晚年厚積薄發、家業豐隆。';
  }

  // 4. 健康與臟腑養生
  const healthMapping = {
    '木': { organ: '肝膽、經絡神經系統、筋骨', advice: '宜戒怒戒躁，少熬夜以護肝血；多做伸展運動，保持情緒舒暢。' },
    '火': { organ: '心臟、小腸、血液循環、眼部', advice: '宜避免長期熬夜亢奮，少食辛辣刺激；平時注意血壓及視力保養。' },
    '土': { organ: '脾胃、消化系統、肌肉肌肉群', advice: '飲食宜定時定量，少吃生冷油膩，防止思慮過多傷脾胃；多接地氣健走。' },
    '金': { organ: '肺臟、呼吸道、大腸及皮毛', advice: '需防換季氣管敏感，避免久處空氣不良處；平時可多深呼吸、補充潤肺生津食材。' },
    '水': { organ: '腎臟、泌尿系統、骨髓與生殖調養', advice: '切忌過勞耗損真陰，注意保暖防寒；多飲好水，維持作息規律。' }
  };

  // 5. 開運錦囊
  const luckyColors = { '木': '青綠色、翠綠、墨黑', '火': '朱砂紅、紫羅蘭、暖橙', '土': '米黃色、咖啡色、暖褐', '金': '純白、金色、銀灰色', '水': '海藍色、深黑、墨灰' };
  const luckyNumbers = { '木': '3、8', '火': '2、7', '土': '5、10', '金': '4、9', '水': '1、6' };
  const luckyDirections = { '木': '正東、東南', '火': '正南', '土': '西南、東北', '金': '正西、西北', '水': '正北' };
  const lifeMotto = {
    '木': '「根深則葉茂，德盛則木榮。」—— 堅持理想，莫忘初衷，厚植根基終成棟樑。',
    '火': '「照亮幽微而不自灼，明以照物而不眩己。」—— 溫柔發光，修斂心性，兼收並蓄。',
    '土': '「厚德載物，靜水流深。」—— 萬物因信而立，海納百川方成其大。',
    '金': '「百煉成純鋼，至剛化純柔。」—— 磨礪鋒芒，以大仁大義行中道。',
    '水': '「上善若水，利萬物而不爭。」—— 順應機遇，圓通不怠，隨方就圓。'
  };

  return {
    meta: {
      birthday: birthdayStr,
      calendarType: calendarType === 'lunar' ? '農曆' : '國曆',
      hourBranch: hourBranch ? `${hourBranch}時` : '未載時辰',
      pillars: `${pillars.year}年 ${pillars.month}月 ${pillars.day}日 ${pillars.hour}時`,
      kongWang: pillars.kongWang.join('、')
    },
    hexagrams: {
      original: originalHex,
      nuclear: nuclearHex,
      palace: `${palaceInfo.palaceName}宮 (${palaceInfo.palaceWuxing}行)`,
      shiPosition: `第${shiLine.lineNum}爻 (世爻持${shiRelation}・${shiLine.branch}${shiWuxing}・臨${shiBeast})`,
      yingPosition: `第${yingLine.lineNum}爻 (應爻持${yingLine.relation}・${yingLine.branch}${yingLine.wuxing})`
    },
    personality: {
      wuxingArchetype: wuxingPersonality[shiWuxing],
      relationDrive: relationPersonality[shiRelation],
      beastManner: beastPersonality[shiBeast],
      coreMindset: `世爻五行屬【${shiWuxing}】，六親居【${shiRelation}】，神煞臨【${shiBeast}】。內心深處以【${shiRelation}】為人生指針，外在行事風格帶有【${shiBeast}】的氣場與修為。`,
      blindSpots: shiWuxing === '木' ? '過於看重道理原則，偶顯死心眼；遇逆境需防自怨自艾，適度學會柔軟妥協。'
        : shiWuxing === '火' ? '急於求成、耐性較短；情緒起伏大時切忌做重大拍板，需防衝動誤事。'
        : shiWuxing === '土' ? '防守有餘而開拓力略顯遲緩；不善言辭表達易生誤會，應勇於踏出舒適圈。'
        : shiWuxing === '金' ? '直來直往不喜拐彎，容易好心辦壞事傷人自尊；需修練圓融傾聽之道。'
        : '心思多慮過敏，常常預想最壞情況而自尋煩惱；應學習化繁為簡、知足常樂。'
    },
    career: {
      recommendedIndustries: careerMapping[shiWuxing],
      roleOrientation: careerRole[shiRelation],
      workStrategy: `以【${shiRelation}】之本性為立身之本，結合五行【${shiWuxing}】特質，不宜隨波逐流。貴人方位多在【${luckyDirections[shiWuxing]}】，逢重大職場抉擇宜審視是否合乎自身天賦。`
    },
    wealth: {
      wealthPattern: wealthSummary,
      caiYaoPresence: caiLines.length > 0 
        ? `卦中見【妻財爻】${caiLines.map(c => `${c.branch}${c.wuxing}`).join('、')}，命中財源具備，生發有根。` 
        : '卦中正財伏藏，求財宜專精本業技術，不可過度沉迷偏門暴利。',
      wealthAdvice: '聚財之道在於「守」大於「攻」。一生中宜建立長期穩健的資產配置（如優質房產或高防禦力標的），切莫為人作保或輕率合資借貸。'
    },
    relationship: {
      shiYingDynamic: WUXING_RELATION[shiWuxing][yingLine.wuxing] === '生' 
        ? '世生應爻，你在感情中屬於主動付出、體貼照顧對方的一方，甘於為家庭奉獻。'
        : WUXING_RELATION[yingLine.wuxing][shiWuxing] === '生'
        ? '應生世爻，容易遇得悉心體貼自己、重視自己感受的伴侶，得另一半寵愛照拂。'
        : WUXING_RELATION[shiWuxing][yingLine.wuxing] === '比和'
        ? '世應比和，雙方如同知心好友般平等相待，互敬互諒、溝通順暢。'
        : '世應相剋，相處中彼此理念有鮮明差異，偶有火花碰撞，關鍵在於學會傾聽與互讓一步。',
      romanceAdvice: '終身感情之福，首重「求同存異」。學會看見對方的優點，不以自己的標準苛求另一半，家庭自然和睦長青。'
    },
    health: {
      organSystem: healthMapping[shiWuxing].organ,
      nurtureTips: healthMapping[shiWuxing].advice
    },
    luckyKit: {
      color: luckyColors[shiWuxing],
      numbers: luckyNumbers[shiWuxing],
      direction: luckyDirections[shiWuxing],
      motto: lifeMotto[shiWuxing]
    }
  };
};

/**
 * 【雙人命卦合盤：契合度與相處指南產生器】
 * 深度比對兩人的命卦世爻、宮位、六神六親，產出合拍分數與詳細相處建議
 */
export const generateCompatibilityReport = ({
  personA, // { name, birthday, destinyReport, shiLine, palaceInfo, hexName }
  personB
}) => {
  const shiA = personA.shiLine;
  const shiB = personB.shiLine;
  const wuxingA = shiA.wuxing;
  const wuxingB = shiB.wuxing;

  let baseScore = 75; // 基準分
  const synergyPoints = [];
  const frictionPoints = [];

  // 1. 世爻五行生剋評估
  const relationAtoB = WUXING_RELATION[wuxingA][wuxingB]; // A對B
  const relationBtoA = WUXING_RELATION[wuxingB][wuxingA]; // B對A

  let dynamicSummary = '';
  if (wuxingA === wuxingB) {
    baseScore += 10;
    dynamicSummary = `【同氣比和 ‧ 默契好友】：雙方世爻同屬【${wuxingA}】，價值觀與生活步調天然契合，如同老友般惺惺相惜，相處自然無拘束。`;
    synergyPoints.push(`同五行思維同頻，容易理解對方的喜怒哀樂，溝通障礙少`);
  } else if (relationAtoB === '生') {
    baseScore += 12;
    dynamicSummary = `【相生相惜 ‧ A方包容】：甲方(${wuxingA})五行生助乙方(${wuxingB})，甲方天然願意對乙方付出、照護與體貼，關係溫潤有情。`;
    synergyPoints.push(`甲方在互動中具備長輩或守護者般的包容心，樂於支持乙方的夢想`);
    frictionPoints.push(`甲方若長期單向付出得不到足夠情緒回饋，可能積累委屈心結`);
  } else if (relationBtoA === '生') {
    baseScore += 12;
    dynamicSummary = `【相生相惜 ‧ B方照拂】：乙方(${wuxingB})五行生助甲方(${wuxingA})，乙方在日常中對甲方呵護備至，常給予實質或情緒依靠。`;
    synergyPoints.push(`乙方能理解接納甲方的脾性，常主動替甲方分憂解勞`);
    frictionPoints.push(`乙方偶爾可能感到管得太寬或操心過度，甲方需常表達感謝`);
  } else if (relationAtoB === '剋') {
    baseScore -= 6;
    dynamicSummary = `【生剋激盪 ‧ A方主導】：甲方(${wuxingA})五行剋制乙方(${wuxingB})，甲方在關鍵決定或氣場上容易佔上風，乙方需多被尊重。`;
    frictionPoints.push(`甲方言詞或要求容易過於直接嚴厲，讓乙方感到壓力或被控制`);
    synergyPoints.push(`甲方能為團隊或家庭掌舵定向，推動目標快速落實`);
  } else {
    baseScore -= 6;
    dynamicSummary = `【生剋激盪 ‧ B方主導】：乙方(${wuxingB})五行剋制甲方(${wuxingA})，乙方性格更具決斷力與管束力，甲方偶有壓迫感。`;
    frictionPoints.push(`乙方容易就細節要求嚴格，甲方若覺自尊受損易引發冷戰`);
    synergyPoints.push(`乙方的理性分析能有效補足甲方的盲點，避免重大失誤`);
  }

  // 2. 六神性格碰撞
  const beastA = shiA.beast;
  const beastB = shiB.beast;
  let personalityClash = '';

  if (beastA === beastB) {
    personalityClash = `兩人都臨【${beastA}】，行事風格極為相似，好時同心協力，爭執時脾性也針鋒相對。`;
  } else {
    personalityClash = `甲方外顯帶有【${beastA}】風範，乙方則帶有【${beastB}】氣息。${beastA}之特質與${beastB}之步調相遇，一動一靜或一剛一柔，充滿互補色彩。`;
  }

  // 3. 卦宮五行生剋
  const palaceA = personA.palaceInfo.palaceWuxing;
  const palaceB = personB.palaceInfo.palaceWuxing;
  if (palaceA === palaceB || WUXING_RELATION[palaceA][palaceB] === '生' || WUXING_RELATION[palaceB][palaceA] === '生') {
    baseScore += 6;
    synergyPoints.push(`雙方卦宮五行相生有情，代表家庭背景或長期相處氛圍融洽，具有共同安全感`);
  } else {
    baseScore -= 4;
    frictionPoints.push(`雙方卦宮相剋，代表在原生家庭觀念或深層安全感來源上存在不同底色，需要多同理溝通`);
  }

  const finalScore = Math.max(50, Math.min(98, baseScore));

  let tier = '相濡以沫 ‧ 和諧良緣';
  let stars = '★★★★☆';
  let badgeColor = 'bg-emerald-600 text-white';

  if (finalScore >= 90) {
    tier = '天作之合 ‧ 神仙眷侶';
    stars = '★★★★★';
    badgeColor = 'bg-rose-600 text-white';
  } else if (finalScore >= 80) {
    tier = '相輔相成 ‧ 珠聯璧合';
    stars = '★★★★☆';
    badgeColor = 'bg-teal-600 text-white';
  } else if (finalScore >= 70) {
    tier = '互補互利 ‧ 漸入佳境';
    stars = '★★★☆☆';
    badgeColor = 'bg-blue-600 text-white';
  } else {
    tier = '歡喜冤家 ‧ 磨合修煉';
    stars = '★★☆☆☆';
    badgeColor = 'bg-amber-600 text-white';
  }

  // 4. 給甲方的相處錦囊
  const adviceForA = [
    `【理解乙方核心思維】：乙方本命屬【${wuxingB}】，最看重的是${wuxingB === '水' ? '溝通靈活與心靈共鳴' : wuxingB === '木' ? '被尊重原則與成長空間' : wuxingB === '火' ? '熱情肯定與及時回應' : wuxingB === '金' ? '是非分明與信用諾言' : '踏實安全感與陪伴'}。切莫用你自己的步調強加給對方。`,
    `【講話避雷指南】：當乙方臨【${beastB}】發脾氣或沉默時，千萬別跟著硬碰硬。給對方十分鐘沉澱緩衝，倒杯水先軟化氛圍，事情就能解決大半。`,
    `【主動釋放愛意】：在日常中多留意對方的付出並真誠道謝，對方會更樂意做你的堅強後盾。`
  ];

  // 5. 給乙方的相處錦囊
  const adviceForB = [
    `【理解甲方核心思維】：甲方本命屬【${wuxingA}】，內心最渴望的是${wuxingA === '水' ? '被理解與心意相通' : wuxingA === '木' ? '志向得到認可支持' : wuxingA === '火' ? '面子被維護與讚美' : wuxingA === '金' ? '擔當被看見與信任' : '家庭與感情的穩定踏實'}。請多給予肯定掌聲。`,
    `【講話避雷指南】：甲方外臨【${beastA}】，最怕冷嘲熱諷或被當眾質疑。有話私下關門溝通，維護好對方的尊嚴，甲方必定會回饋更多溫柔。`,
    `【留出彈性空間】：適度放下控制欲，允許兩人間保留少許個人獨處時光，距離往往能產生更深的美感。`
  ];

  // 6. 雙方黃金相處法則
  const goldenRules = [
    '【衝突三分鐘熄火守則】：一旦察覺爭執火氣上升，雙方約定先暫停對話三分鐘，喝一口水或各自深呼吸，絕不在情緒最高點吐出傷人字眼。',
    '【每週心靈復盤時刻】：每週挑一個輕鬆的時間（如散步或夜聊），不談柴米油鹽壓力，只聊彼此這一週開心的事，給感情常態保溫。',
    '【雙方共同願景錨定】：將精力放在共同的目標上（如一趟旅遊、一項家庭儲蓄計畫），同甘共苦的革命情感是抵禦所有碎屑矛盾的最佳良方。'
  ];

  return {
    score: finalScore,
    stars,
    tier,
    badgeColor,
    dynamicSummary,
    personalityClash,
    synergyPoints,
    frictionPoints,
    adviceForA,
    adviceForB,
    goldenRules
  };
};
