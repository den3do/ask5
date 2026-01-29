import './style.css'
import React, { useState, useEffect, useMemo } from 'react';

// --- 基礎資料庫 ---

// 八卦基礎屬性
const TRIGRAMS = {
  1: { name: '乾', nature: '天', symbol: '☰', binary: '111', wuxing: '金', color: 'text-gray-800' },
  2: { name: '兌', nature: '澤', symbol: '☱', binary: '011', wuxing: '金', color: 'text-blue-600' },
  3: { name: '離', nature: '火', symbol: '☲', binary: '101', wuxing: '火', color: 'text-red-600' },
  4: { name: '震', nature: '雷', symbol: '☳', binary: '001', wuxing: '木', color: 'text-green-700' },
  5: { name: '巽', nature: '風', symbol: '☴', binary: '110', wuxing: '木', color: 'text-green-500' },
  6: { name: '坎', nature: '水', symbol: '☵', binary: '010', wuxing: '水', color: 'text-blue-800' },
  7: { name: '艮', nature: '山', symbol: '☶', binary: '100', wuxing: '土', color: 'text-stone-600' },
  0: { name: '坤', nature: '地', symbol: '☷', binary: '000', wuxing: '土', color: 'text-yellow-800' }
};

// 地支五行
const BRANCH_WUXING = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

// 五行生剋關係: me -> other (我生other, 我剋other...)
const WUXING_RELATION = {
  '金': { '金': '比和', '木': '剋', '水': '生', '火': '被剋', '土': '被生' },
  '木': { '金': '被剋', '木': '比和', '水': '被生', '火': '生', '土': '剋' },
  '水': { '金': '被生', '木': '生', '水': '比和', '火': '剋', '土': '被剋' },
  '火': { '金': '剋', '木': '被生', '水': '被剋', '火': '比和', '土': '生' },
  '土': { '金': '生', '木': '被剋', '水': '剋', '火': '被生', '土': '比和' }
};

// 納甲規則
const NAJIA_TABLE = {
  1: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  2: { inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
  3: { inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  4: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  5: { inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  6: { inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  7: { inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  0: { inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] }
};

// 干支資料
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// --- 地支刑沖合害 判斷邏輯 ---
const checkBranchInteraction = (b1, b2) => {
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
const getRelation = (meWuxing, otherWuxing) => {
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
const getSixBeasts = (dayStem) => {
  const map = { '甲': 0, '乙': 0, '丙': 1, '丁': 1, '戊': 2, '己': 3, '庚': 4, '辛': 4, '壬': 5, '癸': 5 };
  const beasts = ['青龍', '朱雀', '勾陳', '螣蛇', '白虎', '玄武'];
  const startIdx = map[dayStem] || 0;
  const result = [];
  for (let i = 0; i < 6; i++) result.push(beasts[(startIdx + i) % 6]);
  return result;
};

// 宮位查找表
const GONG_DATA = {
  1: [{ u:1, l:1, s:6 }, { u:1, l:5, s:1 }, { u:1, l:7, s:2 }, { u:1, l:0, s:3 }, { u:5, l:0, s:4 }, { u:7, l:0, s:5 }, { u:3, l:0, s:4 }, { u:3, l:1, s:3 }],
  2: [{ u:2, l:2, s:6 }, { u:2, l:6, s:1 }, { u:2, l:0, s:2 }, { u:2, l:7, s:3 }, { u:6, l:7, s:4 }, { u:0, l:7, s:5 }, { u:4, l:7, s:4 }, { u:4, l:2, s:3 }],
  3: [{ u:3, l:3, s:6 }, { u:3, l:7, s:1 }, { u:3, l:5, s:2 }, { u:3, l:6, s:3 }, { u:7, l:6, s:4 }, { u:5, l:6, s:5 }, { u:1, l:6, s:4 }, { u:1, l:3, s:3 }],
  4: [{ u:4, l:4, s:6 }, { u:4, l:0, s:1 }, { u:4, l:6, s:2 }, { u:4, l:5, s:3 }, { u:0, l:5, s:4 }, { u:6, l:5, s:5 }, { u:2, l:5, s:4 }, { u:2, l:4, s:3 }],
  5: [{ u:5, l:5, s:6 }, { u:5, l:1, s:1 }, { u:5, l:3, s:2 }, { u:5, l:4, s:3 }, { u:1, l:4, s:4 }, { u:3, l:4, s:5 }, { u:7, l:4, s:4 }, { u:7, l:5, s:3 }],
  6: [{ u:6, l:6, s:6 }, { u:6, l:2, s:1 }, { u:6, l:4, s:2 }, { u:6, l:3, s:3 }, { u:2, l:3, s:4 }, { u:4, l:3, s:5 }, { u:0, l:3, s:4 }, { u:0, l:6, s:3 }],
  7: [{ u:7, l:7, s:6 }, { u:7, l:3, s:1 }, { u:7, l:0, s:2 }, { u:7, l:2, s:3 }, { u:3, l:2, s:4 }, { u:0, l:2, s:5 }, { u:5, l:2, s:4 }, { u:5, l:7, s:3 }],
  0: [{ u:0, l:0, s:6 }, { u:0, l:4, s:1 }, { u:0, l:2, s:2 }, { u:0, l:6, s:3 }, { u:4, l:6, s:4 }, { u:2, l:6, s:5 }, { u:6, l:2, s:4 }, { u:6, l:0, s:3 }]
};

const findPalaceAndShi = (uid, lid) => {
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

// 完整六十四卦資料庫
const HEXAGRAM_DATA = {
  "1-1": { name: "乾為天", text: "元亨利貞。", lines: ["潛龍勿用。", "見龍在田。", "君子終日乾乾。", "或躍在淵。", "飛龍在天。", "亢龍有悔。"] },
  "0-0": { name: "坤為地", text: "元亨，利牝馬之貞。", lines: ["履霜，堅冰至。", "直方大。", "含章可貞。", "括囊。", "黃裳，元吉。", "龍戰于野。"] },
  "6-4": { name: "水雷屯", text: "元亨利貞。勿用有筱往。", lines: ["磐桓，利居貞。", "屯如邅如。", "即鹿無虞。", "乘馬班如。", "屯其膏。", "乘馬班如，泣血漣如。"] },
  "7-6": { name: "山水蒙", text: "亨。匪我求童蒙，童蒙求我。", lines: ["發蒙。", "包蒙吉。", "勿用取女。", "困蒙吝。", "童蒙吉。", "擊蒙。"] },
  "6-1": { name: "水天需", text: "有孚，光亨，貞吉。", lines: ["需于郊。", "需于沙。", "需于泥。", "需于血。", "需于酒食。", "入于穴。"] },
  "1-6": { name: "天水訟", text: "有孚，窒惕，中吉，終凶。", lines: ["不永所事。", "不克訟。", "食舊德。", "不克訟。", "訟元吉。", "或錫之鞶帶。"] },
  "0-6": { name: "地水師", text: "貞，丈人吉，無咎。", lines: ["師出以律。", "在師中。", "師或輿尸。", "師左次。", "田有禽。", "大君有命。"] },
  "6-0": { name: "水地比", text: "吉。原筮，元永貞，無咎。", lines: ["有孚比之。", "比之自內。", "比之匪人。", "外比之。", "顯比。", "比之無首。"] },
  "5-1": { name: "風天小畜", text: "亨。密雲不雨。", lines: ["復自道。", "牽復。", "輿說輻。", "有孚，血去惕出。", "有孚攣如。", "既雨既處。"] },
  "1-2": { name: "天澤履", text: "履虎尾，不咥人，亨。", lines: ["素履。", "履道坦坦。", "眇能視。", "履虎尾。", "夬履。", "視履考祥。"] },
  "0-1": { name: "地天泰", text: "小往大來，吉，亨。", lines: ["拔茅茹。", "包荒。", "無平不陂。", "翩翩。", "帝乙歸妹。", "城復于隍。"] },
  "1-0": { name: "天地否", text: "否之匪人。", lines: ["拔茅茹。", "包承。", "包羞。", "有命無咎。", "休否。", "傾否。"] },
  "1-3": { name: "天火同人", text: "同人于野，亨。", lines: ["同人于門。", "同人于宗。", "伏戎于莽。", "乘其墉。", "同人，先號啕而後笑。", "同人于郊。"] },
  "3-1": { name: "火天大有", text: "元亨。", lines: ["無交害。", "大車以載。", "公用亨于天子。", "匪其彭。", "厥孚交如。", "自天佑之。"] },
  "0-7": { name: "地山謙", text: "亨，君子有終。", lines: ["謙謙君子。", "鳴謙。", "勞謙君子。", "無不利，撝謙。", "不富以其鄰。", "鳴謙。"] },
  "4-0": { name: "雷地豫", text: "利建侯行師。", lines: ["鳴豫。", "介于石。", "盱豫。", "由豫。", "貞疾。", "冥豫。"] },
  "2-4": { name: "澤雷隨", text: "元亨，利貞，無咎。", lines: ["官有變。", "係小子。", "係丈夫。", "隨有獲。", "孚于嘉。", "拘係之。"] },
  "7-5": { name: "山風蠱", text: "元亨，利涉大川。", lines: ["幹父之蠱。", "幹母之蠱。", "幹父之蠱。", "裕父之蠱。", "幹父之蠱。", "不事王侯。"] },
  "0-2": { name: "地澤臨", text: "元亨，利貞。", lines: ["咸臨。", "咸臨。", "甘臨。", "至臨。", "知臨。", "敦臨。"] },
  "5-0": { name: "風地觀", text: "盥而不薦。", lines: ["童觀。", "闚觀。", "觀我生。", "觀國之光。", "觀我生。", "觀其生。"] },
  "3-4": { name: "火雷噬嗑", text: "亨。利用獄。", lines: ["屨校滅趾。", "噬膚滅鼻。", "噬臘肉。", "噬乾胏。", "噬乾肉。", "何校滅耳。"] },
  "7-3": { name: "山火賁", text: "亨。小利有攸往。", lines: ["賁其趾。", "賁其須。", "賁如濡如。", "賁如皤如。", "賁于丘園。", "白賁。"] },
  "7-0": { name: "山地剝", text: "不利有攸往。", lines: ["剝床以足。", "剝床以辨。", "剝之。", "剝床以膚。", "貫魚。", "碩果不食。"] },
  "0-4": { name: "地雷復", text: "亨。出入無疾。", lines: ["不遠復。", "休復。", "頻復。", "中行獨復。", "敦復。", "迷復。"] },
  "1-4": { name: "天雷無妄", text: "元亨，利貞。", lines: ["無妄。", "不耕穫。", "無妄之災。", "可貞。", "無妄之疾。", "無妄。"] },
  "7-1": { name: "山天大畜", text: "利貞。", lines: ["有厲。", "輿說輻。", "良馬逐。", "童牛之牿。", "豶豕之牙。", "何天之衢。"] },
  "7-4": { name: "山雷頤", text: "貞吉。觀頤。", lines: ["捨爾靈龜。", "顛頤。", "拂頤。", "顛頤。", "拂經。", "由頤。"] },
  "2-5": { name: "澤風大過", text: "棟橈。", lines: ["藉用白茅。", "枯楊生稊。", "棟橈。", "棟隆。", "枯楊生華。", "過涉滅頂。"] },
  "6-6": { name: "坎為水", text: "習坎，有孚。", lines: ["習坎。", "坎有險。", "來之坎坎。", "樽酒簋貳。", "坎不盈。", "係用徽纆。"] },
  "3-3": { name: "離為火", text: "利貞，亨。", lines: ["履錯然。", "黃離。", "日昃之離。", "突如其來如。", "出涕沱若。", "王用出征。"] },
  "2-7": { name: "澤山咸", text: "亨，利貞。", lines: ["咸其拇。", "咸其腓。", "咸其股。", "貞吉。", "咸其脢。", "咸其輔。"] },
  "4-5": { name: "雷風恆", text: "亨，無咎。", lines: ["浚恆。", "悔亡。", "不恆其德。", "田無禽。", "恆其德。", "振恆。"] },
  "1-7": { name: "天山遯", text: "亨，小利貞。", lines: ["遯尾。", "執之用黃牛之革。", "係遯。", "好遯。", "嘉遯。", "肥遯。"] },
  "4-1": { name: "雷天大壯", text: "利貞。", lines: ["壯于趾。", "貞吉。", "小人用壯。", "貞吉。", "喪羊于易。", "羝羊觸藩。"] },
  "3-0": { name: "火地晉", text: "康侯用錫馬蕃庶。", lines: ["晉如。", "晉如。", "眾允。", "晉如鼫鼠。", "悔亡。", "晉其角。"] },
  "0-3": { name: "地火明夷", text: "利艱貞。", lines: ["明夷于飛。", "明夷。", "明夷于南狩。", "入于左腹。", "箕子之明夷。", "不明晦。"] },
  "5-3": { name: "風火家人", text: "利女貞。", lines: ["閑有家。", "無攸遂。", "家人嗃嗃。", "富家。", "王假有家。", "有孚威如。"] },
  "3-2": { name: "火澤睽", text: "小事吉。", lines: ["悔亡。", "遇主于巷。", "見輿曳。", "睽孤。", "悔亡。", "睽孤。"] },
  "6-7": { name: "水山蹇", text: "利西南，不利東北。", lines: ["往蹇。", "王臣蹇蹇。", "往蹇。", "往蹇。", "大蹇。", "往蹇。"] },
  "4-6": { name: "雷水解", text: "利西南。", lines: ["無咎。", "田獲三狐。", "負且乘。", "解而拇。", "君子維有解。", "公用射隼。"] },
  "7-2": { name: "山澤損", text: "有孚，元吉。", lines: ["已事遄往。", "利貞。", "三人行。", "損其疾。", "或益之。", "弗損益之。"] },
  "5-4": { name: "風雷益", text: "利有攸往。", lines: ["利用為大作。", "或益之。", "益之用凶事。", "中行。", "有孚惠心。", "莫益之。"] },
  "2-1": { name: "澤天夬", text: "揚于王庭。", lines: ["壯于前趾。", "惕號。", "壯于頄。", "臀無膚。", "莧陸夬夬。", "無號。"] },
  "1-5": { name: "天風姤", text: "女壯，勿用取女。", lines: ["繫于金柅。", "包有魚。", "臀無膚。", "包無魚。", "以杞包瓜。", "姤其角。"] },
  "2-0": { name: "澤地萃", text: "亨。王假有廟。", lines: ["有孚不終。", "引吉。", "萃如。", "大吉。", "萃有位。", "齎咨涕洟。"] },
  "0-5": { name: "地風升", text: "元亨。", lines: ["允升。", "孚乃利用禴。", "升虛邑。", "王用亨于岐山。", "貞吉。", "冥升。"] },
  "2-6": { name: "澤水困", text: "亨，貞，大人吉。", lines: ["臀困于株木。", "困于酒食。", "困于石。", "來徐徐。", "劓刖。", "困于葛藟。"] },
  "6-5": { name: "水風井", text: "改邑不改井。", lines: ["井泥不食。", "井谷射鮒。", "井渫不食。", "井甃。", "井冽。", "井收勿幕。"] },
  "2-3": { name: "澤火革", text: "己日乃孚。", lines: ["鞏用黃牛之革。", "己日乃革之。", "征凶。", "悔亡。", "大人虎變。", "君子豹變。"] },
  "5-2": { name: "風火鼎", text: "元吉，亨。", lines: ["鼎顛趾。", "鼎有實。", "鼎耳革。", "鼎折足。", "鼎黃耳金鉉。", "鼎玉鉉。"] },
  "4-4": { name: "震為雷", text: "亨。震來虩虩。", lines: ["震來虩虩。", "震來厲。", "震蘇蘇。", "震遂泥。", "震往來厲。", "震索索。"] },
  "7-7": { name: "艮為山", text: "艮其背。", lines: ["艮其趾。", "艮其腓。", "艮其限。", "艮其身。", "艮其輔。", "敦艮。"] },
  "5-7": { name: "風山漸", text: "女歸吉。", lines: ["鴻漸于干。", "鴻漸于磐。", "鴻漸于陸。", "鴻漸于木。", "鴻漸于陵。", "鴻漸于陸。"] },
  "4-2": { name: "雷澤歸妹", text: "征凶。", lines: ["歸妹以弟。", "眇能視。", "歸妹以須。", "歸妹愆期。", "帝乙歸妹。", "女承筐無實。"] },
  "4-3": { name: "雷火豐", text: "亨。", lines: ["遇其配主。", "豐其蔀。", "豐其沛。", "豐其蔀。", "來章。", "豐其屋。"] },
  "3-7": { name: "火山旅", text: "小亨，旅貞吉。", lines: ["旅瑣瑣。", "旅即次。", "旅焚其次。", "旅于處。", "射雉一矢亡。", "鳥焚其巢。"] },
  "5-5": { name: "巽為風", text: "小亨。", lines: ["進退。", "巽在床下。", "頻巽。", "悔亡。", "貞吉。", "巽在床下。"] },
  "2-2": { name: "兌為澤", text: "亨，利貞。", lines: ["和兌。", "孚兌。", "來兌。", "商兌。", "孚于剝。", "引兌。"] },
  "5-6": { name: "風水渙", text: "亨。", lines: ["用拯馬壯。", "渙奔其機。", "渙其躬。", "渙其群。", "渙汗其大號。", "渙其血。"] },
  "6-2": { name: "水澤節", text: "亨。", lines: ["不出戶庭。", "不出門庭。", "不節若。", "安節。", "甘節。", "苦節。"] },
  "5-8": { name: "風澤中孚", text: "豚魚吉。", lines: ["虞吉。", "鳴鶴在陰。", "得敵。", "月幾望。", "有孚攣如。", "翰音登于天。"] },
  "4-7": { name: "雷山小過", text: "亨，利貞。", lines: ["飛鳥以凶。", "過其祖。", "弗過防之。", "無咎。", "密雲不雨。", "弗遇過之。"] },
  "6-3": { name: "水火既濟", text: "亨，小利貞。", lines: ["曳其輪。", "婦喪其弗。", "高宗伐鬼方。", "繻有衣袽。", "東鄰殺牛。", "濡其首。"] },
  "3-6": { name: "火水未濟", text: "亨，小狐汔濟。", lines: ["濡其尾。", "曳其輪。", "未濟。", "貞吉。", "貞吉。", "有孚于飲酒。"] }
};

const getHexData = (u, l) => {
  const key = `${u}-${l}`;
  return HEXAGRAM_DATA[key] || { 
    name: `卦 (${u}-${l})`, 
    text: "（請參考六爻五行分析）", 
    lines: ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] 
  };
};

// --- 四柱計算邏輯 ---

// 五鼠遁日 (日干 -> 時干)
const getHourStem = (dayStem, hourBranchIdx) => {
  const dayIdx = STEMS.indexOf(dayStem);
  let startStemIdx = 0;
  
  if (dayIdx === 0 || dayIdx === 5) startStemIdx = 0; // 甲己 -> 甲
  else if (dayIdx === 1 || dayIdx === 6) startStemIdx = 2; // 乙庚 -> 丙
  else if (dayIdx === 2 || dayIdx === 7) startStemIdx = 4; // 丙辛 -> 戊
  else if (dayIdx === 3 || dayIdx === 8) startStemIdx = 6; // 丁壬 -> 庚
  else if (dayIdx === 4 || dayIdx === 9) startStemIdx = 8; // 戊癸 -> 壬
  
  return STEMS[(startStemIdx + hourBranchIdx) % 10];
};

const DivinationApp = () => {
  // UI 狀態
  const [inputs, setInputs] = useState({ num1: '', num2: '', num3: '' });
  const [question, setQuestion] = useState('');
  
  // 時間狀態
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [hourIdx, setHourIdx] = useState(new Date().getHours() >= 23 ? 0 : Math.ceil(new Date().getHours() / 2) % 12); // 預設當前時辰
  
  const [result, setResult] = useState(null);
  const [promptText, setPromptText] = useState('');

  // 計算四柱
  const pillars = useMemo(() => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    
    // 年柱 (簡易: 以立春分界太複雜，這裡簡化使用當年干支，或用戶手動指定更準)
    const yOffset = (year - 1984) % 60;
    const yStem = STEMS[Math.abs(yOffset % 10)];
    const yBranch = BRANCHES[Math.abs(yOffset % 12)];

    // 日柱 (使用基準日算法 2000-01-01 戊午)
    const refDate = new Date(2000, 0, 1);
    const dayDiff = Math.floor((d - refDate) / (1000 * 60 * 60 * 24));
    const stemRef = 4; 
    const branchRef = 6;
    
    let dStemIdx = (stemRef + dayDiff) % 10;
    let dBranchIdx = (branchRef + dayDiff) % 12;
    if (dStemIdx < 0) dStemIdx += 10;
    if (dBranchIdx < 0) dBranchIdx += 12;

    const dStem = STEMS[dStemIdx];
    const dBranch = BRANCHES[dBranchIdx];
    
    // 時柱
    const hBranch = BRANCHES[hourIdx];
    const hStem = getHourStem(dStem, hourIdx);

    return {
      year: `${yStem}${yBranch}`,
      month: `(依節氣)`, // 月柱實務上需複雜節氣庫
      day: `${dStem}${dBranch}`,
      hour: `${hStem}${hBranch}`,
      dayStem: dStem,
      dayBranch: dBranch,
      yearBranch: yBranch,
      hourBranch: hBranch
    };
  }, [dateStr, hourIdx]);

  const handleCalculate = () => {
    const n1 = parseInt(inputs.num1);
    const n2 = parseInt(inputs.num2);
    const n3 = parseInt(inputs.num3);

    if (isNaN(n1) || isNaN(n2) || isNaN(n3)) {
      alert("請輸入三個數字");
      return;
    }

    // 1. 本卦
    const uMod = n1 % 8;
    const lMod = n2 % 8;
    const uTrigram = TRIGRAMS[uMod];
    const lTrigram = TRIGRAMS[lMod];

    // 2. 動爻
    let moving = n3 % 6;
    if (moving === 0) moving = 6;

    // 3. 變卦與變爻推導
    const getBits = (bin) => bin.split('').map(Number);
    // 轉換 binary '111' (上中下) 為 爻位 (下中上)
    const lBits = getBits(lTrigram.binary); // [Line3, Line2, Line1]
    const uBits = getBits(uTrigram.binary); // [Line6, Line5, Line4]
    
    // 建立 1-6 爻 map
    const lineMap = {
      1: lBits[2], 2: lBits[1], 3: lBits[0],
      4: uBits[2], 5: uBits[1], 6: uBits[0]
    };

    // 計算新 Trigrams
    let newLId = lMod;
    let newUId = uMod;
    const flip = (bit) => bit === 1 ? 0 : 1;
    let newLBits = [...lBits];
    let newUBits = [...uBits];

    if (moving <= 3) {
      const idx = 3 - moving; // 1->2, 2->1, 3->0
      newLBits[idx] = flip(newLBits[idx]);
    } else {
      const idx = 6 - moving; // 4->2, 5->1, 6->0
      newUBits[idx] = flip(newUBits[idx]);
    }

    const findId = (bits) => {
      const bin = bits.join('');
      return Object.keys(TRIGRAMS).find(k => TRIGRAMS[k].binary === bin);
    };
    newLId = findId(newLBits);
    newUId = findId(newUBits);
    const newLTrigram = TRIGRAMS[newLId];
    const newUTrigram = TRIGRAMS[newUId];

    // 4. 六親六獸與變爻詳情
    const palaceInfo = findPalaceAndShi(uMod, lMod);
    const sixBeasts = getSixBeasts(pillars.dayStem);
    
    const innerNaJia = NAJIA_TABLE[lMod].inner;
    const outerNaJia = NAJIA_TABLE[uMod].outer;
    const allBranches = [...innerNaJia, ...outerNaJia];

    const newInnerNaJia = NAJIA_TABLE[newLId].inner;
    const newOuterNaJia = NAJIA_TABLE[newUId].outer;
    const allNewBranches = [...newInnerNaJia, ...newOuterNaJia];

    const linesData = [];
    const allLinesBits = [lBits[2], lBits[1], lBits[0], uBits[2], uBits[1], uBits[0]];

    for (let i = 0; i < 6; i++) {
      const lineNum = i + 1;
      const bit = allLinesBits[i];
      const branch = allBranches[i];
      const wuxing = BRANCH_WUXING[branch];
      const relation = getRelation(palaceInfo.palaceWuxing, wuxing);
      const beast = sixBeasts[i];
      
      let changedData = null;
      if (moving === lineNum) {
        const cBranch = allNewBranches[i];
        const cWuxing = BRANCH_WUXING[cBranch];
        // 變爻六親：以本宮五行為準
        const cRelation = getRelation(palaceInfo.palaceWuxing, cWuxing);
        
        // 回頭生剋 (變 對 本)
        const interact = WUXING_RELATION[cWuxing][wuxing]; 
        
        // 刑沖合害 (新功能)
        const specialInteract = checkBranchInteraction(branch, cBranch);

        changedData = {
          branch: cBranch,
          wuxing: cWuxing,
          relation: cRelation,
          interact: interact,
          specialInteract: specialInteract // 存入刑沖合害
        };
      }

      linesData.push({
        lineNum, bit, branch, wuxing, relation, beast,
        isShi: palaceInfo.shi === lineNum,
        isYing: palaceInfo.ying === lineNum,
        isMoving: moving === lineNum,
        changed: changedData
      });
    }

    const hexInfo = getHexData(uMod, lMod);
    const newHexInfo = getHexData(newUId, newLId);

    setResult({
      uTrigram, lTrigram, newUTrigram, newLTrigram,
      palaceInfo, linesData, moving,
      textData: { original: hexInfo, changed: newHexInfo, movingText: hexInfo.lines[moving-1] || "" },
      pillars
    });
  };

  // 生成 AI 提示詞
  useEffect(() => {
    if (!result) return;
    const { pillars, linesData, moving, uTrigram, lTrigram, newUTrigram, newLTrigram, palaceInfo, textData } = result;

    const linesStr = [...linesData].reverse().map(l => {
      const markers = [];
      if (l.isShi) markers.push('世');
      if (l.isYing) markers.push('應');
      const baseStr = `第${l.lineNum}爻 ${l.bit===1?'陽':'陰'} ${l.beast} [${l.relation}] ${l.branch}${l.wuxing} ${markers.join('')}`;
      
      if (l.isMoving && l.changed) {
        // 加入刑沖合害的描述
        const special = l.changed.specialInteract ? ` 【回頭${l.changed.specialInteract}】` : '';
        return `${baseStr} \n    └── 動化: [${l.changed.relation}] ${l.changed.branch}${l.changed.wuxing} (${l.changed.interact}本爻${special})`;
      }
      return baseStr;
    }).join('\n');

    const prompt = `道長您好，弟子請教。

【問事】：${question || '（未填寫，請綜觀推斷）'}
【時間】：${pillars.year}年 ${pillars.month}月 ${pillars.day}日 ${pillars.hour}時
【四柱】：${pillars.year} / (月柱依節氣) / ${pillars.day} / ${pillars.hour}
【日干】：${pillars.dayStem} (需參看日建沖合)

【卦象】：${uTrigram.nature}${lTrigram.nature}${textData.original.name} 之 ${newUTrigram.nature}${newLTrigram.nature}${textData.changed.name}
【宮位】：${palaceInfo.palaceName}宮${palaceInfo.palaceWuxing}行

【動爻解析】：
第 ${moving} 爻發動。
動爻本氣：${linesData[moving-1].branch}${linesData[moving-1].wuxing} (${linesData[moving-1].relation})
動化變出：${linesData[moving-1].changed.branch}${linesData[moving-1].changed.wuxing} (${linesData[moving-1].changed.relation})
五行作用：變爻 ${linesData[moving-1].changed.interact} 本爻
特殊關係：${linesData[moving-1].changed.specialInteract || '無特殊刑沖合'}

【全盤爻象】：
${linesStr}

請依據《文王課》六爻法與《梅花易數》綜合解盤：
1. **目前現況**：本卦象說明，參照 卦象 開題說明 
2. **吉凶判斷**：以世爻為核心，分析動爻對世爻的作用（生剋沖合）。
3. **動變分析**：特別注意「回頭生/剋」以及「變爻刑沖合害」的影響。
4. **動變後分析**：未來可能狀況
5. **具體建議**：針對問事給予指引。`;


    setPromptText(prompt);
  }, [result]);

  return (
    <div className="min-h-screen bg-stone-100 p-2 md:p-6 font-serif text-stone-900">
      
      <div className="max-w-4xl mx-auto border-b-2 border-stone-300 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-stone-800">六爻全功能排盤</h1>
        <p className="text-stone-500 text-sm">動變互化 ‧ 刑沖合害 ‧ 完整卦辭</p>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-stone-200 mb-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded border border-stone-100">
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">占卜日期</label>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">占卜時辰</label>
            <select value={hourIdx} onChange={e => setHourIdx(parseInt(e.target.value))} className="w-full p-2 border rounded">
              {BRANCHES.map((b, i) => (
                <option key={i} value={i}>{b}時 ({i===0?'23-01':(i*2-1)+'-'+(i*2+1)})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 text-center text-sm text-stone-600">
             預排四柱：
             <span className="font-bold mx-1">{pillars.year} 年</span>
             <span className="text-gray-400 mx-1">(月)</span>
             <span className="font-bold mx-1">{pillars.day} 日</span>
             <span className="font-bold mx-1">{pillars.hour} 時</span>
          </div>
        </div>

        <div className="space-y-4">
          <input 
            type="text" 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="請輸入想問的事情..."
            className="w-full p-3 border border-stone-300 rounded focus:border-stone-500 outline-none"
          />
          <div className="flex justify-center gap-2">
            <input type="number" name="num1" value={inputs.num1} onChange={e => setInputs({...inputs, num1: e.target.value})} placeholder="上卦" className="w-20 p-3 border rounded text-center text-lg" />
            <input type="number" name="num2" value={inputs.num2} onChange={e => setInputs({...inputs, num2: e.target.value})} placeholder="下卦" className="w-20 p-3 border rounded text-center text-lg" />
            <input type="number" name="num3" value={inputs.num3} onChange={e => setInputs({...inputs, num3: e.target.value})} placeholder="動爻" className="w-20 p-3 border rounded text-center text-lg" />
            <button onClick={handleCalculate} className="bg-stone-800 text-white px-6 rounded font-bold hover:bg-stone-700">排盤</button>
          </div>
        </div>
      </div>

      {result && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          
          <div className="bg-white shadow-xl border-2 border-stone-400 rounded-lg overflow-hidden">
            <div className="bg-stone-50 p-4 border-b border-stone-200 flex flex-wrap justify-between items-end">
               <div>
                 <div className="text-xs text-stone-500 mb-1">{result.palaceInfo.palaceName}宮{result.palaceInfo.palaceWuxing}行</div>
                 <h2 className="text-2xl font-bold text-stone-800">
                   {result.textData.original.name} <span className="text-gray-400 text-base font-normal">之</span> {result.textData.changed.name}
                 </h2>
               </div>
               <div className="text-right text-xs text-stone-400 mt-2 md:mt-0">
                 日干: <span className="text-stone-600 font-bold">{result.pillars.dayStem}</span> | 
                 動爻: <span className="text-red-600 font-bold">{result.moving}</span>
               </div>
            </div>

            <div className="p-4 md:p-8 overflow-x-auto">
              <div className="flex min-w-[600px] text-xs text-stone-400 border-b border-stone-100 pb-2 mb-2">
                <div className="w-20 pl-2">六獸</div>
                <div className="w-24">六親</div>
                <div className="w-20">干支</div>
                <div className="flex-1 text-center">卦爻 (本 &rarr; 變)</div>
                <div className="w-48 pl-4">動變解析 (刑沖合害)</div>
              </div>

              <div className="flex flex-col gap-2 min-w-[600px]">
                {[...result.linesData].reverse().map((line, idx) => (
                  <div key={idx} className={`flex items-center py-2 rounded border-b border-stone-50 ${line.isMoving ? 'bg-yellow-50' : ''}`}>
                    <div className="w-20 pl-2 text-sm font-medium" style={{
                      color: ['青龍','玄武'].includes(line.beast)?'green': ['朱雀'].includes(line.beast)?'red': ['白虎'].includes(line.beast)?'gray': 'brown'
                    }}>{line.beast}</div>

                    <div className="w-24 font-bold text-stone-700 relative">
                      {line.relation}
                      {line.isShi && <span className="absolute -left-1 -top-1 text-[10px] text-white bg-red-500 px-1 rounded">世</span>}
                      {line.isYing && <span className="absolute -left-1 -top-1 text-[10px] text-white bg-blue-500 px-1 rounded">應</span>}
                    </div>

                    <div className="w-20 text-stone-500 font-mono text-sm">{line.branch}{line.wuxing}</div>

                    <div className="flex-1 flex justify-center items-center gap-4">
                      <div className="w-16 flex justify-between">
                         {line.bit===1 ? <div className="w-full h-3 bg-stone-800 rounded-sm"></div> : <><div className="w-[45%] h-3 bg-stone-800 rounded-sm"></div><div className="w-[45%] h-3 bg-stone-800 rounded-sm"></div></>}
                      </div>
                      <span className="text-stone-300 text-xs">➔</span>
                      <div className="w-16 flex justify-between opacity-60">
                         {line.isMoving ? (
                           line.bit===1 ? <><div className="w-[45%] h-3 bg-stone-400 rounded-sm"></div><div className="w-[45%] h-3 bg-stone-400 rounded-sm"></div></> : <div className="w-full h-3 bg-stone-400 rounded-sm"></div>
                         ) : (
                           line.bit===1 ? <div className="w-full h-3 bg-stone-200 rounded-sm"></div> : <><div className="w-[45%] h-3 bg-stone-200 rounded-sm"></div><div className="w-[45%] h-3 bg-stone-200 rounded-sm"></div></>
                         )}
                      </div>
                    </div>

                    <div className="w-48 pl-4 text-xs">
                      {line.isMoving && line.changed && (
                        <div className="animate-pulse">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500">化 <span className="font-bold text-stone-800">{line.changed.branch}{line.changed.wuxing}</span></span>
                            <span className="font-bold text-indigo-600">變 {line.changed.relation}</span>
                          </div>
                          <div className="mt-1 flex gap-1">
                            <span className="bg-stone-100 px-1 rounded text-stone-500">{line.changed.interact}本爻</span>
                            {line.changed.specialInteract && (
                              <span className={`px-1 rounded font-bold text-white ${line.changed.specialInteract.includes('沖') ? 'bg-red-500' : 'bg-green-600'}`}>
                                {line.changed.specialInteract}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-2">🤖 AI 道長提示詞 (含刑沖合害)</h3>
            <textarea 
              readOnly 
              value={promptText}
              className="w-full h-32 p-3 text-xs bg-white border border-indigo-200 rounded focus:outline-none mb-2"
            />
            <button 
              onClick={() => {navigator.clipboard.writeText(promptText); alert("已複製！");}}
              className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 w-full"
            >
              複製並詢問 Gemini
            </button>
          </div>

        </div>
      )}
    </div>
  );
};


export default DivinationApp;
