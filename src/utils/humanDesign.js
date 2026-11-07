/**
 * 人類圖（Human Design）運算引擎 - 純前端
 * 流程：星曆行星黃經 → 64 閘門與爻 → 通道 → 能量中心 → 類型 / 內在權威 / 人生角色
 *
 * 設計（紅身 / 潛意識）時刻：出生前太陽恰好退回 88° 的時刻（非固定 88 天）。
 * 閘門輪盤：Gate 41 始於回歸黃道 302°（水瓶座 2°00'），每閘 5.625°，每爻 0.9375°。
 */
import { bodyLongitude, findSunLongitudeTime, localToUtcDate, norm360 } from './ephemeris.js';

// 輪盤順序（自 Gate 41 @ 302° 起逐閘排列）
export const HD_GATE_SEQUENCE = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17,
  21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35,
  45, 12, 15, 52, 39, 53, 62, 56, 31, 33, 7, 4,
  29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58,
  38, 54, 61, 60,
];
export const HD_WHEEL_START = 302; // Gate 41 起始黃經
const GATE_SPAN = 360 / 64; // 5.625
const LINE_SPAN = GATE_SPAN / 6; // 0.9375

// 九大中心的閘門（共 64 個，彼此不重複）
export const HD_CENTERS = {
  head: { name: '頭腦中心', chName: '頭腦', gates: [64, 61, 63], color: '#a855f7', desc: '靈感壓力、問題與靈感泉源', motor: false },
  ajna: { name: '邏輯中心（阿傑那）', chName: '邏輯', gates: [47, 24, 4, 17, 43, 11], color: '#3b82f6', desc: '思考、概念、確定性', motor: false },
  throat: { name: '喉嚨中心', chName: '喉嚨', gates: [62, 23, 56, 16, 35, 12, 45, 33, 8, 31, 20], color: '#f59e0b', desc: '溝通、顯化、行動的中心', motor: false },
  gCenter: { name: 'G中心（身份認同）', chName: 'G中心', gates: [1, 2, 7, 10, 13, 15, 25, 46], color: '#f97316', desc: '身份、愛、方向感與自我意識', motor: false },
  heart: { name: '心臟中心（意志力）', chName: '心臟', gates: [21, 26, 40, 51], color: '#ef4444', desc: '意志力、自我價值感、物質世界', motor: true },
  solar: { name: '情緒中心（太陽神經叢）', chName: '情緒', gates: [6, 22, 30, 36, 37, 49, 55], color: '#ec4899', desc: '情緒波浪、感性、靈性壓力', motor: true },
  sacral: { name: '薦骨中心', chName: '薦骨', gates: [3, 5, 9, 14, 27, 29, 34, 42, 59], color: '#10b981', desc: '生命力、工作能量、生育力', motor: true },
  spleen: { name: '脾臟中心（直覺）', chName: '脾臟', gates: [18, 28, 32, 44, 48, 50, 57], color: '#84cc16', desc: '直覺本能、健康感知、當下意識', motor: false },
  root: { name: '根部中心', chName: '根部', gates: [19, 38, 39, 41, 52, 53, 54, 58, 60], color: '#b45309', desc: '腎上腺素壓力、動力驅動力、演化', motor: true },
};

/** 閘門 → 所屬中心 */
export const GATE_TO_CENTER = (() => {
  const map = {};
  for (const [key, c] of Object.entries(HD_CENTERS)) for (const g of c.gates) map[g] = key;
  return map;
})();

// 36 條通道
export const HD_CHANNELS = [
  { gates: [1, 8], name: '靈感通道', shortName: '靈感' },
  { gates: [2, 14], name: '脈動通道', shortName: '脈動' },
  { gates: [3, 60], name: '突變通道', shortName: '突變' },
  { gates: [4, 63], name: '邏輯通道', shortName: '邏輯' },
  { gates: [5, 15], name: '律動通道', shortName: '律動' },
  { gates: [6, 59], name: '親密通道', shortName: '親密' },
  { gates: [7, 31], name: '領導通道', shortName: '領導' },
  { gates: [9, 52], name: '專注通道', shortName: '專注' },
  { gates: [10, 20], name: '覺醒通道', shortName: '覺醒' },
  { gates: [10, 34], name: '探索通道', shortName: '探索' },
  { gates: [10, 57], name: '完美形式通道', shortName: '完美形式' },
  { gates: [11, 56], name: '好奇通道', shortName: '好奇' },
  { gates: [12, 22], name: '開放通道', shortName: '開放' },
  { gates: [13, 33], name: '浪子通道', shortName: '浪子' },
  { gates: [16, 48], name: '波長通道', shortName: '波長' },
  { gates: [17, 62], name: '接受通道', shortName: '接受' },
  { gates: [18, 58], name: '審判通道', shortName: '審判' },
  { gates: [19, 49], name: '合成通道', shortName: '合成' },
  { gates: [20, 34], name: '魅力通道', shortName: '魅力' },
  { gates: [20, 57], name: '腦波通道', shortName: '腦波' },
  { gates: [21, 45], name: '金錢通道', shortName: '金錢' },
  { gates: [23, 43], name: '結構通道', shortName: '結構' },
  { gates: [24, 61], name: '覺察通道', shortName: '覺察' },
  { gates: [25, 51], name: '啟蒙通道', shortName: '啟蒙' },
  { gates: [26, 44], name: '傳遞通道', shortName: '傳遞' },
  { gates: [27, 50], name: '守護通道', shortName: '守護' },
  { gates: [28, 38], name: '掙扎通道', shortName: '掙扎' },
  { gates: [29, 46], name: '發現通道', shortName: '發現' },
  { gates: [30, 41], name: '認可通道', shortName: '認可' },
  { gates: [32, 54], name: '轉化通道', shortName: '轉化' },
  { gates: [34, 57], name: '能力通道', shortName: '能力' },
  { gates: [35, 36], name: '短暫通道', shortName: '短暫' },
  { gates: [37, 40], name: '社群通道', shortName: '社群' },
  { gates: [39, 55], name: '感性通道', shortName: '感性' },
  { gates: [42, 53], name: '成熟通道', shortName: '成熟' },
  { gates: [47, 64], name: '抽象通道', shortName: '抽象' },
].map((ch) => ({
  ...ch,
  centers: [GATE_TO_CENTER[ch.gates[0]], GATE_TO_CENTER[ch.gates[1]]],
}));

/** 計算用的行星／天體清單（13 個啟動點） */
export const HD_BODIES = ['sun', 'earth', 'moon', 'northNode', 'southNode', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
export const HD_BODY_LABEL = {
  sun: '太陽', earth: '地球', moon: '月亮', northNode: '北交點', southNode: '南交點',
  mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星',
  uranus: '天王星', neptune: '海王星', pluto: '冥王星',
};

/** 黃道經度 → 閘門與爻 */
export function lonToGateLine(lon) {
  const offset = norm360(lon - HD_WHEEL_START);
  const gateIndex = Math.min(63, Math.floor(offset / GATE_SPAN));
  const within = offset - gateIndex * GATE_SPAN;
  const line = Math.min(6, Math.floor(within / LINE_SPAN) + 1);
  return { gate: HD_GATE_SEQUENCE[gateIndex], line };
}

function planetGates(date) {
  const result = {};
  for (const id of HD_BODIES) {
    const lon = bodyLongitude(id, date);
    result[id] = { lon, ...lonToGateLine(lon) };
  }
  return result;
}

/** 中心連通圖：BFS 判斷 from 是否能經由已定義通道抵達 targets 任一中心 */
function connected(definedChannels, from, isTarget) {
  const adj = {};
  for (const ch of definedChannels) {
    const [a, b] = ch.centers;
    (adj[a] ||= []).push(b);
    (adj[b] ||= []).push(a);
  }
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur !== from && isTarget(cur)) return true;
    for (const n of adj[cur] || []) {
      if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  return false;
}

function analyseCenters(activeGates) {
  const definedChannels = HD_CHANNELS.filter((ch) => activeGates.has(ch.gates[0]) && activeGates.has(ch.gates[1]));
  const definedKeys = new Set();
  for (const ch of definedChannels) ch.centers.forEach((c) => definedKeys.add(c));

  const centers = {};
  for (const [key, c] of Object.entries(HD_CENTERS)) {
    centers[key] = {
      ...c,
      key,
      isDefined: definedKeys.has(key),
      activeGates: c.gates.filter((g) => activeGates.has(g)),
    };
  }
  return { centers, definedChannels };
}

/** 分離定義（Definition）：已定義中心形成幾個互不相連的區塊 */
function getDefinition(centers, definedChannels) {
  const defined = Object.values(centers).filter((c) => c.isDefined).map((c) => c.key);
  if (defined.length === 0) return '無定義';
  const parent = {};
  defined.forEach((k) => { parent[k] = k; });
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const ch of definedChannels) parent[find(ch.centers[0])] = find(ch.centers[1]);
  const groups = new Set(defined.map(find)).size;
  return ['', '單一定義', '二分定義', '三分定義', '四分定義'][groups] || `${groups}分定義`;
}

function getType(centers, definedChannels) {
  const defined = (k) => centers[k].isDefined;
  const definedCount = Object.values(centers).filter((c) => c.isDefined).length;

  if (definedCount === 0) {
    return { type: '反映者', strategy: '等待一個月亮週期（約 28 天）', sign: '◎', color: '#a855f7', signature: '驚喜', notSelf: '失望', rate: '約 1%' };
  }
  if (defined('sacral')) {
    const toThroat = connected(definedChannels, 'sacral', (c) => c === 'throat');
    return toThroat
      ? { type: '顯示生產者', strategy: '等待回應，回應後告知再行動', sign: '◉', color: '#10b981', signature: '滿足', notSelf: '挫折與憤怒', rate: '約 32%' }
      : { type: '生產者', strategy: '等待並回應', sign: '●', color: '#22c55e', signature: '滿足', notSelf: '挫折', rate: '約 37%' };
  }
  const motorToThroat = defined('throat') && ['heart', 'solar', 'root'].some((m) => defined(m) && connected(definedChannels, m, (c) => c === 'throat'));
  if (motorToThroat) {
    return { type: '顯示者', strategy: '告知後行動', sign: '♦', color: '#ef4444', signature: '平靜', notSelf: '憤怒', rate: '約 9%' };
  }
  return { type: '投映者', strategy: '等待被認可與邀請', sign: '◈', color: '#3b82f6', signature: '成功', notSelf: '苦澀', rate: '約 20%' };
}

/** 內在權威 */
function getAuthority(centers, definedChannels, type) {
  const defined = (k) => centers[k].isDefined;
  if (type === '反映者') return '月亮週期權威（等待 28 天）';
  if (defined('solar')) return '情緒權威（等待情緒波浪平息）';
  if (defined('sacral')) return '薦骨權威（跟隨當下的內在回應）';
  if (defined('spleen')) return '脾臟權威（相信瞬間的直覺）';
  // 以下需看通道連接（僅「中心有定義」並不足以構成該權威）
  if (defined('heart')) {
    if (connected(definedChannels, 'heart', (c) => c === 'throat')) return '意志力權威・顯示者（心臟連喉嚨：說出真正的承諾與意願）';
    if (connected(definedChannels, 'heart', (c) => c === 'gCenter')) return '意志力權威・投射者（心臟連 G 中心：依據真正的意願與價值）';
  }
  if (defined('gCenter') && connected(definedChannels, 'gCenter', (c) => c === 'throat')) {
    return '自我投射權威（G 中心連喉嚨：說出口來聽見自己）';
  }
  return '無內在權威・心智投射（以喉嚨／邏輯／頭腦為主，透過與信任的人討論來判斷）';
}

const PROFILE_NAMES = {
  '1/3': '研究者／烈士', '1/4': '研究者／機會主義者', '2/4': '隱士／機會主義者',
  '2/5': '隱士／異端者', '3/5': '烈士／異端者', '3/6': '烈士／楷模',
  '4/6': '機會主義者／楷模', '4/1': '機會主義者／研究者', '5/1': '異端者／研究者',
  '5/2': '異端者／隱士', '6/2': '楷模／隱士', '6/3': '楷模／烈士',
};

function getProfile(consciousSunLine, unconsciousSunLine) {
  const key = `${consciousSunLine}/${unconsciousSunLine}`;
  return { profile: key, description: PROFILE_NAMES[key] || `${key}號人格` };
}

/**
 * 主計算入口
 * @param {Object} p 出生當地日期時間與 tz（小時差）
 */
export function calculateHumanDesign({ year, month, day, hour = 12, minute = 0, tz = 8, timeKnown = true }) {
  const main = computeHd({ year, month, day, hour, minute, tz });
  if (timeKnown) return { ...main, timeUncertainty: null };

  // 出生時間不詳：月亮一天走約 13°（每閘 5.625°），用當日 00:00 與 23:59 兩端檢查結果是否穩定
  const a = computeHd({ year, month, day, hour: 0, minute: 0, tz });
  const b = computeHd({ year, month, day, hour: 23, minute: 59, tz });
  const setA = new Set(a.activeGates); const setB = new Set(b.activeGates);
  const gatesUncertain = [...new Set([...setA, ...setB])].filter((g) => setA.has(g) !== setB.has(g)).sort((x, y) => x - y);
  const typeStable = a.typeInfo.type === b.typeInfo.type;
  const authorityStable = a.authority === b.authority;
  const profileStable = a.profileInfo.profile === b.profileInfo.profile;
  const channelKey = (r) => r.definedChannels.map((c) => c.gates.join('-')).join(',');
  const channelsStable = channelKey(a) === channelKey(b);
  const parts = [];
  if (!typeStable) parts.push(`類型可能是${a.typeInfo.type}或${b.typeInfo.type}`);
  if (!authorityStable) parts.push('內在權威不確定');
  if (!profileStable) parts.push(`人生角色可能是${a.profileInfo.profile}或${b.profileInfo.profile}`);
  if (!channelsStable) parts.push('部分通道與中心定義不確定');
  const note = parts.length
    ? `出生時間不詳：${parts.join('；')}（不確定的閘門：${gatesUncertain.join('、') || '無'}）。請取得出生時間後再看人類圖。`
    : '出生時間不詳，但當日 00:00–24:00 的類型、權威、角色與通道皆相同，結果可信（僅月亮、設計月亮的閘門／爻數可能不同）。';
  return { ...main, timeUncertainty: { typeStable, authorityStable, profileStable, channelsStable, gatesUncertain, note, alt: [a.typeInfo.type, b.typeInfo.type] } };
}

function computeHd({ year, month, day, hour = 12, minute = 0, tz = 8 }) {
  const birthDate = localToUtcDate({ year, month, day, hour, minute, tz });
  if (Number.isNaN(birthDate.getTime())) throw new Error('出生日期或時間無效');

  // 設計時刻：太陽退回 88°
  const natalSun = bodyLongitude('sun', birthDate);
  const designDate = findSunLongitudeTime(norm360(natalSun - 88), new Date(birthDate.getTime() - 88 * 86400000));

  const conscious = planetGates(birthDate);
  const unconscious = planetGates(designDate);

  const activeGateSet = new Set();
  for (const d of Object.values(conscious)) activeGateSet.add(d.gate);
  for (const d of Object.values(unconscious)) activeGateSet.add(d.gate);

  const { centers, definedChannels } = analyseCenters(activeGateSet);
  const typeInfo = getType(centers, definedChannels);
  const authority = getAuthority(centers, definedChannels, typeInfo.type);
  const definition = getDefinition(centers, definedChannels);
  const profileInfo = getProfile(conscious.sun.line, unconscious.sun.line);

  return {
    birthDate,
    designDate,
    conscious,
    unconscious,
    activeGates: Array.from(activeGateSet).sort((a, b) => a - b),
    consciousGates: [...new Set(Object.values(conscious).map((d) => d.gate))],
    unconsciousGates: [...new Set(Object.values(unconscious).map((d) => d.gate))],
    definedChannels,
    centers,
    typeInfo,
    authority,
    definition,
    profileInfo,
    definedCenterCount: Object.values(centers).filter((c) => c.isDefined).length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 雙人人類圖合盤
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 比對兩人的通道關係
 * - electromagnetic 電磁：各自擁有通道的一端，湊成完整通道（強烈吸引）
 * - companion 同伴：兩人都有完整通道（默契、共鳴）
 * - compromise 妥協：一人有完整通道，另一人有其中一端（需要磨合）
 * - dominance 支配：一人有完整通道，另一人兩端都沒有（一方主導該能量）
 */
export function compareHumanDesign(hdA, hdB, nA = 'A', nB = 'B') {
  const gatesA = new Set(hdA.activeGates);
  const gatesB = new Set(hdB.activeGates);
  const result = { electromagnetic: [], companion: [], compromise: [], dominance: [] };

  for (const ch of HD_CHANNELS) {
    const [g1, g2] = ch.gates;
    const fullA = gatesA.has(g1) && gatesA.has(g2);
    const fullB = gatesB.has(g1) && gatesB.has(g2);
    const countA = (gatesA.has(g1) ? 1 : 0) + (gatesA.has(g2) ? 1 : 0);
    const countB = (gatesB.has(g1) ? 1 : 0) + (gatesB.has(g2) ? 1 : 0);

    if (fullA && fullB) result.companion.push({ ...ch, who: '雙方皆有' });
    else if (fullA && countB === 1) result.compromise.push({ ...ch, who: `${nA} 完整、${nB} 一端` });
    else if (fullB && countA === 1) result.compromise.push({ ...ch, who: `${nB} 完整、${nA} 一端` });
    else if (fullA && countB === 0) result.dominance.push({ ...ch, who: `${nA} 主導` });
    else if (fullB && countA === 0) result.dominance.push({ ...ch, who: `${nB} 主導` });
    else if (!fullA && !fullB && countA === 1 && countB === 1) {
      const aHas = gatesA.has(g1) ? g1 : g2;
      const bHas = gatesB.has(g1) ? g1 : g2;
      if (aHas !== bHas) result.electromagnetic.push({ ...ch, who: `${nA} 的 G${aHas} ＋ ${nB} 的 G${bHas}` });
    }
  }

  const clamp = (v) => Math.max(30, Math.min(97, Math.round(v)));
  const score = clamp(
    55
    + result.electromagnetic.length * 7
    + result.companion.length * 5
    - result.compromise.length * 2
    - result.dominance.length * 1
    + (hdA.typeInfo.type === hdB.typeInfo.type ? -2 : 3)
  );
  return { ...result, score };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Prompt
// ─────────────────────────────────────────────────────────────────────────────

export function generateHumanDesignAiPrompt(hdData, personName = '命主') {
  if (!hdData) return '';
  const { typeInfo, profileInfo, definedChannels, centers, activeGates, conscious, unconscious, authority, definition } = hdData;

  const definedCenterNames = Object.values(centers).filter((c) => c.isDefined).map((c) => c.chName).join('、');
  const undefinedCenterNames = Object.values(centers).filter((c) => !c.isDefined).map((c) => c.chName).join('、');
  const channelNames = definedChannels.map((c) => `${c.gates[0]}-${c.gates[1]} ${c.name}`).join('、');

  return `您好，請以當代人類圖（Human Design System）頂尖解盤導師的視角，為【${personName}】進行完整的人類圖本命盤深度解析：

【人類圖基本設計】：
- 能量類型（Type）：${typeInfo.type}（${typeInfo.rate}）
- 人生策略（Strategy）：${typeInfo.strategy}
- 內在權威（Authority）：${authority}
- 定義類型：${definition}
- 人生角色（Profile）：${profileInfo.profile} - 【${profileInfo.description}】
- 天賦主題 / 非自己主題：${typeInfo.signature} / ${typeInfo.notSelf}
- 意識太陽（黑身/性格）：Gate ${conscious.sun.gate}.${conscious.sun.line}　意識地球：Gate ${conscious.earth.gate}.${conscious.earth.line}
- 潛意識太陽（紅身/設計）：Gate ${unconscious.sun.gate}.${unconscious.sun.line}　潛意識地球：Gate ${unconscious.earth.gate}.${unconscious.earth.line}

【能量中心定義】：
- ✅ 已定義中心：${definedCenterNames || '無'}
- ⬜ 未定義（開放）中心：${undefinedCenterNames || '全定義'}

【點亮的通道（Channels）】：
${channelNames || '無完整通道'}

【活躍閘門】：
Gate ${activeGates.join('、')}

【請為命主提供以下五個層次的深度指引】：

一、【能量類型、策略與內在權威】：
   ${typeInfo.type}的本質特性是什麼？「${typeInfo.strategy}」如何搭配「${authority}」幫助命主在現實中做決策？違背時會出現什麼阻力（${typeInfo.notSelf}）？

二、【人生角色 ${profileInfo.profile} 的靈魂任務與行為模式】：
   ${profileInfo.description}的核心使命與特徵？在人際關係中如何體現？典型成長課題為何？

三、【已定義中心的天賦與核心能量】：
   解析已定義中心（${definedCenterNames || '無'}）帶來的穩定才能，以及在工作、人際與創造力上的表現方式。

四、【未定義中心的開放性與制約】：
   解析未定義中心（${undefinedCenterNames || '無'}）如何成為最大的學習場域，以及最容易受外界影響而偏離自我的陷阱。

五、【關鍵通道的命格象徵與大師指路】：
   深度解析最重要的 1-2 條通道如何塑造獨特天賦，並以一段充滿洞察力的話語作為核心指引。`;
}
