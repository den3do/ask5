import { TYPES, DIMENSIONS, FN_NAMES } from '../data/mbti.js';
import { DETAIL } from '../data/mbtiDetail.js';

const DIM_KEYS = ['EI', 'SN', 'TF', 'JP'];

// 每個維度:相同(aa/bb)與不同(ab)時的相處說明。{x}{y} 會替換成人名
const DIM_TEXT = {
  EI: {
    E: { text: '你們都從互動中獲得能量,話題多、行程滿,相處熱鬧。', risk: '可能都搶著說、沒人聽,也容易忽略彼此需要獨處的時刻。', tip: '每隔一陣子刻意安排安靜的相處,輪流當聽眾。' },
    I: { text: '你們都需要獨處充電,沉默不會尷尬,彼此很能理解對方的界線。', risk: '可能太安靜、各過各的,誰都不主動,關係慢慢變淡。', tip: '約定固定的「主動聯絡」或相聚時間,把想法說出口而不是默默猜。' },
    diff: { text: '{x}帶動社交與話題,{y}帶來深度與穩定,是動靜互補的組合。', risk: '{x}覺得{y}悶、不夠投入;{y}覺得{x}吵、不留空間。', tip: '{x}給{y}獨處與思考的時間,{y}主動把想法與需求說出來,並偶爾陪{x}參加活動。' },
  },
  SN: {
    S: { text: '你們都重視具體、現實與可驗證的事,規劃務實、執行力強。', risk: '容易陷入慣例,缺少突破與新鮮感,遇到全新情況可能都很保守。', tip: '定期嘗試一件沒做過的事,為關係或工作注入新鮮感。' },
    N: { text: '你們都愛談想法、可能性與意義,聊起來停不下來,彼此很有火花。', risk: '細節、帳單、日常瑣事容易沒人處理,點子多但落地少。', tip: '把想法寫下來並指定誰在何時做,日常事務用清單分工。' },
    diff: { text: '{x}提供事實、細節與執行,{y}帶來願景與創意,視野互補。', risk: '{y}覺得{x}保守、太拘泥細節;{x}覺得{y}不切實際、愛空想。', tip: '{y}提出想法時附上一個可執行的第一步;{x}先聽完構想再評估,別一開始就說「做不到」。' },
  },
  TF: {
    T: { text: '你們都以邏輯與公平為先,討論直接有效率,吵架也能就事論事。', risk: '可能忽略情緒,顯得冷淡,遇到需要安慰時雙方都在「解決問題」。', tip: '刻意加入一句關心或肯定,再討論解法;說出你需要被安慰還是需要建議。' },
    F: { text: '你們都重視感受與和諧,互相體貼、很有同理心。', risk: '怕傷感情而迴避衝突,問題悶著不說,累積成怨。', tip: '約定「說出不舒服」的安全方式,溫和但明確地提出需要。' },
    diff: { text: '{x}提供客觀分析與原則,{y}提供對人的敏感與同理,決策更全面。', risk: '{y}覺得{x}冷漠、不顧感受;{x}覺得{y}太情緒化、不講道理。', tip: '{x}先接住情緒再談方案;{y}把需求與事實分開說,不要期待對方猜。' },
  },
  JP: {
    J: { text: '你們都偏好計畫與結論,分工清楚、準時、可靠。', risk: '都想掌控時容易僵持,遇到臨時變動雙方都焦慮。', tip: '預留彈性時段,並約定誰在什麼議題上有最後決定權。' },
    P: { text: '你們都隨興彈性,相處輕鬆自在,不容易有壓力。', risk: '決定常拖著、責任模糊、期限被延後,事情不了了之。', tip: '重要事項設定明確期限與負責人,至少先訂出最低限度的計畫。' },
    diff: { text: '{x}帶來計畫與完成度,{y}帶來彈性與應變力,可以互補。', risk: '{y}覺得{x}控制欲強、太僵硬;{x}覺得{y}不負責、拖延。', tip: '重要事項由{x}訂出骨架與期限,細節留給{y}彈性發揮;{y}遇到計畫改變要提早告知。' },
  },
};

// 情境建議:依維度「相同/不同」挑選
const SCENE_TEXT = {
  情侶: {
    TF: { same: '遇到爭執時,先確認對方要的是「解法」還是「被理解」,再決定怎麼回應。', diff: '一方想解決問題、一方想被聽見:先安慰、後討論,可避免一吵再吵。' },
    EI: { same: '約會節奏容易契合;記得偶爾換個與平常不同的模式(動/靜)來增加新鮮感。', diff: '約會時兼顧「出門社交」與「在家獨處」,各自保有充電時間而不覺得被忽略。' },
  },
  職場: {
    JP: { same: '分工與期限容易達成共識;要留意是否因為都偏愛某種節奏而缺少緩衝與修正。', diff: '先把期限與交付物談清楚,過程允許彈性;重大變更提早通知,減少對方壓力。' },
    SN: { same: '做事風格相近,溝通成本低;務必有人專門扮演「質疑者」,避免集體盲點。', diff: '一個人看全局、一個人盯細節,是很好的專案搭檔——規劃階段先聽願景,執行階段看細節。' },
  },
  朋友與家人: {
    JP: { same: '相約活動容易有共識;偶爾讓步,體驗對方習慣之外的方式。', diff: '一起出遊時,有計畫的人排出骨架,隨興的人負責臨場驚喜,互相尊重各自的節奏。' },
    TF: { same: '互相很能理解彼此的反應與說話方式;別忘了偶爾說出對彼此的感謝。', diff: '一方說話較直、一方較重感受:直的人放軟語氣,重感受的人記得「對事不對人」。' },
  },
};

const MEET_TAG = {
  4: { tag: '鏡像雙生', desc: '你們是同一型,彼此太了解了,默契極高,也會看到「另一個自己」的缺點。' },
  3: { tag: '近親頻率', desc: '你們只有一個維度不同,價值與習慣大多相近,溝通順暢,差異點正好是互相學習的地方。' },
  2: { tag: '平衡搭檔', desc: '你們有一半相似、一半互補,既有共同語言,也有足夠的差異互相補位。' },
  1: { tag: '強互補', desc: '你們多數維度不同,看事情的角度差很多,初期可能覺得「怎麼這麼不一樣」,但互補性也最大。' },
  0: { tag: '完全相反', desc: '你們四個維度都相反,像是彼此的「鏡子」。差異大、吸引力也大,關鍵在於願不願意理解對方的世界。' },
};

const fill = (s, x, y) => s.replaceAll('{x}', x).replaceAll('{y}', y);

/**
 * 產生相處指南
 * a、b:{ type:'ENFP', name:'你' }
 */
export function buildMatchGuide(a, b) {
  const A = TYPES[a.type];
  const B = TYPES[b.type];
  if (!A || !B) return null;
  const an = a.name || '你';
  const bn = b.name || '對方';

  // 維度比對
  const dims = DIM_KEYS.map((k) => {
    const la = a.type[DIM_KEYS.indexOf(k)];
    const lb = b.type[DIM_KEYS.indexOf(k)];
    const same = la === lb;
    const t = DIM_TEXT[k];
    // diff 時 x 是前一極(E/S/T/J)的人
    let x = an;
    let y = bn;
    if (!same && la !== DIMENSIONS[k].a) { x = bn; y = an; }
    const pick = same ? t[la] : t.diff;
    return {
      key: k,
      title: DIMENSIONS[k].title,
      a: la,
      b: lb,
      same,
      text: fill(pick.text, x, y),
      risk: fill(pick.risk, x, y),
      tip: fill(pick.tip, x, y),
    };
  });
  const sameCount = dims.filter((d) => d.same).length;
  const meet = MEET_TAG[sameCount];

  // 認知功能比對
  const fnA = A.fn;
  const fnB = B.fn;
  const insights = [];
  if (fnA[0] === fnB[0]) {
    insights.push({ kind: '共同語言', text: `你們的主導功能同為 ${fnA[0]}(${FN_NAMES[fnA[0]]}),看事情的核心方式一致,容易有「被懂」的感覺。` });
  }
  if (fnA[0] === fnB[1] || fnB[0] === fnA[1]) {
    const [p, q] = fnA[0] === fnB[1] ? [an, bn] : [bn, an];
    const f = fnA[0] === fnB[1] ? fnA[0] : fnB[0];
    insights.push({ kind: '相互欣賞', text: `${p}最擅長的 ${f} 正是${q}的輔助功能,${q}會自然欣賞並受益於${p}的這項強項。` });
  }
  if (fnA[0] === fnB[3] || fnB[0] === fnA[3]) {
    const [p, q] = fnA[0] === fnB[3] ? [an, bn] : [bn, an];
    const f = fnA[0] === fnB[3] ? fnA[0] : fnB[0];
    insights.push({ kind: '吸引與摩擦', text: `${p}的主導功能 ${f}(${FN_NAMES[f]})正好是${q}最不擅長、最需要成長的部分——${q}會被${p}吸引,也容易在這裡感到壓力。多些耐心,這裡是彼此學習最多的地方。` });
  }
  const shared = fnA.slice(0, 2).filter((f) => fnB.slice(0, 2).includes(f));
  if (shared.length && fnA[0] !== fnB[0]) {
    insights.push({ kind: '共有強項', text: `你們都擅長使用 ${shared.join('、')},在這方面能夠合作順暢。` });
  }
  if (!insights.length) {
    insights.push({ kind: '各有專長', text: `你們的認知功能重疊不多(${fnA.slice(0, 2).join('/')} 與 ${fnB.slice(0, 2).join('/')}),看事情的方式不同,請多以好奇代替評斷。` });
  }

  // 情境
  const dimSame = Object.fromEntries(dims.map((d) => [d.key, d.same]));
  const scenes = Object.entries(SCENE_TEXT).map(([scene, byDim]) => ({
    scene,
    items: Object.entries(byDim).map(([k, v]) => v[dimSame[k] ? 'same' : 'diff']),
  }));

  // 彼此怎麼對待
  const detA = DETAIL[a.type];
  const detB = DETAIL[b.type];

  // 行動清單
  const actions = dims.filter((d) => !d.same).map((d) => d.tip);
  if (!actions.length) actions.push(dims[0].tip, dims[2].tip);
  actions.push('定期(例如每月)各說一件「對方做得好的事」與一件「希望調整的事」。');
  actions.push('發生誤會時先問「你的意思是……嗎?」,確認後再回應。');

  return {
    an, bn, A, B,
    meet: { ...meet, same: sameCount },
    dims,
    insights,
    scenes,
    forMe: { title: `${an}怎麼對待${bn}(${b.type})`, tips: detB.tips, needs: detB.needs, comm: detB.comm },
    forThem: { title: `${bn}怎麼對待${an}(${a.type})`, tips: detA.tips, needs: detA.needs, comm: detA.comm },
    stress: [
      { who: an, type: a.type, text: detA.stress },
      { who: bn, type: b.type, text: detB.stress },
    ],
    actions,
  };
}

export function buildMatchText(g, a, b) {
  const L = [];
  L.push(`【MBTI 相處指南】${g.an}(${a.type} ${g.A.name}) × ${g.bn}(${b.type} ${g.B.name})`);
  L.push(`關係類型:${g.meet.tag}(相同維度 ${g.meet.same}/4)`);
  L.push(g.meet.desc);
  L.push('');
  L.push('◆ 四個維度');
  g.dims.forEach((d) => L.push(`・${d.title}(${d.a} vs ${d.b}):${d.text}\n  可能的摩擦:${d.risk}\n  建議:${d.tip}`));
  L.push('');
  L.push('◆ 認知功能觀察');
  g.insights.forEach((i) => L.push(`・${i.kind}:${i.text}`));
  L.push('');
  L.push('◆ 彼此怎麼對待');
  [g.forMe, g.forThem].forEach((f) => {
    L.push(`${f.title}\n  溝通風格:${f.comm}\n  最需要:${f.needs}\n  相處建議:${f.tips.join(';')}`);
  });
  L.push('');
  L.push('◆ 情境建議');
  g.scenes.forEach((s) => L.push(`${s.scene}:\n  ${s.items.join('\n  ')}`));
  L.push('');
  L.push('◆ 壓力下的反應');
  g.stress.forEach((s) => L.push(`・${s.who}(${s.type}):${s.text}`));
  L.push('');
  L.push('◆ 行動清單');
  g.actions.forEach((t, i) => L.push(`${i + 1}. ${t}`));
  L.push('');
  L.push('※ 本指南依類型傾向產生,僅供娛樂與自我探索;每個人都是獨特的,請以實際相處為準。');
  return L.join('\n');
}
