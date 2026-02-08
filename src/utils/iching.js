import { TRIGRAMS, GONG_DATA, HEXAGRAM_DATA, STEMS } from '../data/constants.js';

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

  // 三合 (申子辰水局、亥卯未木局、寅午戌火局、巳酉丑金局)
  const tripleCombines = [
    { branches: ['申','子','辰'], type: '三合水局' },
    { branches: ['亥','卯','未'], type: '三合木局' },
    { branches: ['寅','午','戌'], type: '三合火局' },
    { branches: ['巳','酉','丑'], type: '三合金局' }
  ];
  for (let combo of tripleCombines) {
    if (combo.branches.includes(b1) && combo.branches.includes(b2)) return combo.type;
  }

  // 三刑 (簡化版：常見組合)
  // 寅巳申, 丑未戌, 子卯, 辰辰, 午午, 酉酉, 亥亥
  // 這裡是 "動變" 也就是 b1 變 b2，主要看 b2 對 b1 的作用
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


// 六親查找
export const getRelation = (meWuxing, otherWuxing) => {
  const interactions = {
    '金': { '金': '兄弟', '木': '妻財', '水': '子孫', '火': '官鬼', '土': '父母' },
    '木': { '金': '官鬼', '木': '兄弟', '水': '父母', '火': '子孫', '土': '妻財' },
    '水': { '金': '父母', '木': '子孫', '水': '兄弟', '火': '妻財', '土': '官鬼' },
    '火': { '金': '妻財', '木': '父母', '水': '官鬼', '火': '兄弟', '土': '子孫' },
    '土': { '金': '子孫', '木': '官鬼', '水': '妻財', '火': '父母', '土': '兄弟' }
  };
  return interactions[meWuxing][otherWuxing];
};

// 六獸起例
export const getSixBeasts = (dayStem) => {
  const map = { '甲': 0, '乙': 0, '丙': 1, '丁': 1, '戊': 2, '己': 3, '庚': 4, '辛': 4, '壬': 5, '癸': 5 };
  const beasts = ['青龍', '朱雀', '勾陳', '螣蛇', '白虎', '玄武'];
  const startIdx = map[dayStem] || 0;
  const result = [];
  for (let i = 0; i < 6; i++) result.push(beasts[(startIdx + i) % 6]);
  return result;
};

export const findPalaceAndShi = (uid, lid) => {
  const u = parseInt(uid);
  const l = parseInt(lid);
  for (const [palaceId, hexes] of Object.entries(GONG_DATA)) {
    for (const h of hexes) {
      if (h.u === u && h.l === l) {
        return { 
          palaceId: palaceId, 
          palaceWuxing: TRIGRAMS[palaceId].wuxing, 
          palaceName: TRIGRAMS[palaceId].name,
          shi: h.s,
          ying: (h.s + 3) > 6 ? (h.s + 3) - 6 : (h.s + 3)
        };
      }
    }
  }
  return { palaceId: 1, palaceWuxing: '金', shi: 1, ying: 4 };
};

export const getHexData = (u, l) => {
  const key = `${u}-${l}`;
  return HEXAGRAM_DATA[key] || { 
    name: `卦 (${u}-${l})`, 
    text: "（請參考六爻五行分析）", 
    lines: ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] 
  };
};

// 五鼠遁日 (日干 -> 時干)
export const getHourStem = (dayStem, hourBranchIdx) => {
  const dayIdx = STEMS.indexOf(dayStem);
  let startStemIdx = 0;
  
  if (dayIdx === 0 || dayIdx === 5) startStemIdx = 0; // 甲己 -> 甲
  else if (dayIdx === 1 || dayIdx === 6) startStemIdx = 2; // 乙庚 -> 丙
  else if (dayIdx === 2 || dayIdx === 7) startStemIdx = 4; // 丙辛 -> 戊
  else if (dayIdx === 3 || dayIdx === 8) startStemIdx = 6; // 丁壬 -> 庚
  else if (dayIdx === 4 || dayIdx === 9) startStemIdx = 8; // 戊癸 -> 壬
  
  return STEMS[(startStemIdx + hourBranchIdx) % 10];
};

// 空亡判斷 (根據日干支)
export const getKongWang = (dayStem, dayBranch) => {
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const dayBranchIdx = branches.indexOf(dayBranch);
  
  // 甲子旬: 甲子至癸酉，空戌亥
  // 甲戌旬: 甲戌至癸未，空申酉
  // 甲申旬: 甲申至癸巳，空午未
  // 甲午旬: 甲午至癸卯，空辰巳
  // 甲辰旬: 甲辰至癸丑，空寅卯
  // 甲寅旬: 甲寅至癸亥，空子丑
  
  const kongWangMap = {
    '子': ['戌', '亥'],
    '丑': ['戌', '亥'],
    '寅': ['子', '丑'],
    '卯': ['子', '丑'],
    '辰': ['寅', '卯'],
    '巳': ['寅', '卯'],
    '午': ['辰', '巳'],
    '未': ['辰', '巳'],
    '申': ['午', '未'],
    '酉': ['午', '未'],
    '戌': ['申', '酉'],
    '亥': ['申', '酉']
  };
  
  return kongWangMap[dayBranch] || [];
};
