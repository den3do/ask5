import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, BookOpen, Users, Calendar, Clock, Compass, Heart, 
  ShieldAlert, CheckCircle2, AlertCircle, Copy, RefreshCw, 
  Award, Briefcase, Coins, Flame, ChevronRight, HelpCircle
} from 'lucide-react';
import { 
  TRIGRAMS, BRANCH_WUXING, WUXING_RELATION, NAJIA_TABLE, STEMS, BRANCHES 
} from './data/constants';
import { 
  checkBranchInteraction, getRelation, getSixBeasts, findPalaceAndShi, 
  getHexData, getHourStem, getKongWang, findNuclearHexagram, 
  evaluateDivination, generateDestinyReport, generateCompatibilityReport 
} from './utils/iching';
import { 
  solarToLunar, lunarToSolar, calculatePillars, calculateDestinyHexNumbers 
} from './utils/lunar';

const DivinationApp = () => {
  // 當前功能 Tab：1=一事一占, 2=個人終身卦, 3=雙人合盤
  const [activeTab, setActiveTab] = useState(1);

  // -------------------------------------------------------------
  // 模組一：一事一占 State
  // -------------------------------------------------------------
  const [divInputs, setDivInputs] = useState({ num1: '', num2: '', num3: '' });
  const [divQuestion, setDivQuestion] = useState('');
  const [divDateStr, setDivDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [divHourIdx, setDivHourIdx] = useState(
    new Date().getHours() >= 23 ? 0 : Math.ceil(new Date().getHours() / 2) % 12
  );
  const [divTopic, setDivTopic] = useState('財運');
  const [divResult, setDivResult] = useState(null);
  const [aiPromptText, setAiPromptText] = useState('');
  const [copiedText, setCopiedText] = useState('');

  // -------------------------------------------------------------
  // 模組二：個人終身卦 State
  // -------------------------------------------------------------
  const [destinyForm, setDestinyForm] = useState({
    name: '',
    calendarType: 'solar', // 'solar' | 'lunar'
    year: '1995',
    month: '8',
    day: '15',
    hourIdx: '6', // 午時 (11-13) 或 '' (無時辰)
    gender: '男'
  });
  const [destinyReport, setDestinyReport] = useState(null);

  // -------------------------------------------------------------
  // 模組三：雙人合盤 State
  // -------------------------------------------------------------
  const [pairForm, setPairForm] = useState({
    personA: {
      name: '甲方',
      calendarType: 'solar',
      year: '1995',
      month: '5',
      day: '20',
      hourIdx: '5',
      gender: '男'
    },
    personB: {
      name: '乙方',
      calendarType: 'solar',
      year: '1996',
      month: '9',
      day: '18',
      hourIdx: '', // 無時辰
      gender: '女'
    }
  });
  const [pairReport, setPairReport] = useState(null);

  // -------------------------------------------------------------
  // 一事一占：即時計算四柱
  // -------------------------------------------------------------
  const currentPillars = useMemo(() => {
    const [y, m, d] = divDateStr.split('-').map(Number);
    return calculatePillars(y, m, d, divHourIdx);
  }, [divDateStr, divHourIdx]);

  // 一事一占：起卦排盤
  const handleDivinationCalculate = () => {
    const n1 = parseInt(divInputs.num1, 10);
    const n2 = parseInt(divInputs.num2, 10);
    const n3 = parseInt(divInputs.num3, 10);

    if (isNaN(n1) || isNaN(n2) || isNaN(n3)) {
      alert("請輸入三個起卦數字（例如：3, 4, 5）");
      return;
    }

    // 上卦、下卦、動爻
    let uNum = n1 % 8;
    if (uNum === 0) uNum = 8;
    let lNum = n2 % 8;
    if (lNum === 0) lNum = 8;
    let moving = n3 % 6;
    if (moving === 0) moving = 6;

    const toTrigramKey = (num) => num === 8 ? 0 : num;
    const uMod = toTrigramKey(uNum);
    const lMod = toTrigramKey(lNum);

    const uTrigram = TRIGRAMS[uMod];
    const lTrigram = TRIGRAMS[lMod];

    // 動變計算
    const getBits = (bin) => bin.split('').map(Number);
    const lBits = getBits(lTrigram.binary);
    const uBits = getBits(uTrigram.binary);

    let newLBits = [...lBits];
    let newUBits = [...uBits];
    const flip = (bit) => bit === 1 ? 0 : 1;

    if (moving <= 3) {
      newLBits[3 - moving] = flip(newLBits[3 - moving]);
    } else {
      newUBits[6 - moving] = flip(newUBits[6 - moving]);
    }

    const findId = (bits) => {
      const bin = bits.join('');
      return parseInt(Object.keys(TRIGRAMS).find(k => TRIGRAMS[k].binary === bin), 10);
    };
    const newLId = findId(newLBits);
    const newUId = findId(newUBits);

    const palaceInfo = findPalaceAndShi(uMod, lMod);
    const sixBeasts = getSixBeasts(currentPillars.dayStem);

    const innerNaJia = NAJIA_TABLE[lMod].inner;
    const outerNaJia = NAJIA_TABLE[uMod].outer;
    const allBranches = [...innerNaJia, ...outerNaJia];

    const newInnerNaJia = NAJIA_TABLE[newLId].inner;
    const newOuterNaJia = NAJIA_TABLE[newUId].outer;
    const allNewBranches = [...newInnerNaJia, ...newOuterNaJia];

    const allLinesBits = [lBits[2], lBits[1], lBits[0], uBits[2], uBits[1], uBits[0]];
    const linesData = [];

    for (let i = 0; i < 6; i++) {
      const lineNum = i + 1;
      const bit = allLinesBits[i];
      const branch = allBranches[i];
      const wuxing = BRANCH_WUXING[branch];
      const relation = getRelation(palaceInfo.palaceWuxing, wuxing);
      const beast = sixBeasts[i];
      const isKongWang = currentPillars.kongWang.includes(branch);
      const isYuePo = branch === currentPillars.yuePoBranch;
      const isRiPo = branch === currentPillars.riPoBranch && (moving !== lineNum);

      let changedData = null;
      if (moving === lineNum) {
        const cBranch = allNewBranches[i];
        const cWuxing = BRANCH_WUXING[cBranch];
        const cRelation = getRelation(palaceInfo.palaceWuxing, cWuxing);
        const interact = WUXING_RELATION[cWuxing][wuxing];
        const specialInteract = checkBranchInteraction(branch, cBranch);
        changedData = {
          branch: cBranch,
          wuxing: cWuxing,
          relation: cRelation,
          interact,
          specialInteract
        };
      }

      linesData.push({
        lineNum,
        bit,
        branch,
        wuxing,
        relation,
        beast,
        isShi: palaceInfo.shi === lineNum,
        isYing: palaceInfo.ying === lineNum,
        isMoving: moving === lineNum,
        isKongWang,
        isYuePo,
        isRiPo,
        changed: changedData
      });
    }

    const hexInfo = getHexData(uMod, lMod);
    const newHexInfo = getHexData(newUId, newLId);
    const nuclearInfo = findNuclearHexagram(uMod, lMod);

    // 進行一事一占演算法評估
    const evaluation = evaluateDivination({
      topic: divTopic,
      pillars: currentPillars,
      linesData,
      movingLine: moving,
      palaceWuxing: palaceInfo.palaceWuxing,
      originalHex: hexInfo,
      changedHex: newHexInfo,
      nuclearHex: nuclearInfo
    });

    const linesWithYongShen = linesData.map(l => ({
      ...l,
      isYongShen: l.relation === evaluation.yongShen.relation
    }));

    setDivResult({
      uTrigram,
      lTrigram,
      newUTrigram: TRIGRAMS[newUId],
      newLTrigram: TRIGRAMS[newLId],
      palaceInfo,
      linesData: linesWithYongShen,
      moving,
      originalHex: hexInfo,
      changedHex: newHexInfo,
      nuclearHex: nuclearInfo,
      pillars: currentPillars,
      topic: divTopic,
      question: divQuestion,
      evaluation
    });
  };

  // 生成 AI Prompt (方便使用者額外複製)
  useEffect(() => {
    if (!divResult) return;
    const { pillars, linesData, moving, palaceInfo, originalHex, changedHex, nuclearHex, evaluation, topic, question } = divResult;

    const linesStr = [...linesData].reverse().map(l => {
      const tags = [];
      if (l.isShi) tags.push('【世】');
      if (l.isYing) tags.push('【應】');
      if (l.isKongWang) tags.push('【空】');
      if (l.isYuePo) tags.push('【月破】');
      if (l.isYongShen) tags.push('【用神】');
      const base = `第${l.lineNum}爻 ${l.bit === 1 ? '陽爻 ⚊' : '陰爻 ⚋'} 臨${l.beast} [${l.relation}] ${l.branch}${l.wuxing} ${tags.join('')}`;
      if (l.isMoving && l.changed) {
        return `${base} ➔ 動化: [${l.changed.relation}] ${l.changed.branch}${l.changed.wuxing} (${l.changed.interact}本爻 ${l.changed.specialInteract || ''})`;
      }
      return base;
    }).join('\n');

    const prompt = `您好，請以專業六爻納甲與梅花易數大師視角，為此卦進行深度占斷：

【占問事項】：${question || '未具體填寫'}
【所屬主題】：${topic} (用神取：${evaluation.yongShen.name})
【起卦時間】：${pillars.year}年 ${pillars.month}月 ${pillars.day}日 ${pillars.hour}時
【四柱干支】：${pillars.year} / ${pillars.month} / ${pillars.day} / ${pillars.hour}
【旬空地支】：${pillars.kongWang.join('、') || '無'} | 【月破】：${pillars.yuePoBranch}

【主卦】：${originalHex.name} (${palaceInfo.palaceName}宮${palaceInfo.palaceWuxing}行)
【互卦】：${nuclearHex.hex.name} (事情發展之中途過程)
【變卦】：${changedHex.name} (事情之最終演變)
【動爻】：第 ${moving} 爻發動

【六爻全盤】：
${linesStr}

【系統評分與斷語參考】：
- 綜合評定：【${evaluation.level}】 (卦氣評分：${evaluation.score}分)
- 評語：${evaluation.fullCommentary}

請依據本卦、互卦、變卦之五行生剋、回頭生剋、神煞與用神旺衰，詳細為我解析：
1. 當前局勢瓶頸與核心癥結。
2. 事情中期的轉折與發展。
3. 最終吉凶走向與明確行動建議。`;

    setAiPromptText(prompt);
  }, [divResult]);

  // -------------------------------------------------------------
  // 終身卦：計算並生成報告
  // -------------------------------------------------------------
  const handleGenerateDestiny = (formOverride = null) => {
    const f = formOverride || destinyForm;
    let sYear = parseInt(f.year, 10);
    let sMonth = parseInt(f.month, 10);
    let sDay = parseInt(f.day, 10);

    let lYear = sYear, lMonth = sMonth, lDay = sDay;
    if (f.calendarType === 'solar') {
      const lunar = solarToLunar(sYear, sMonth, sDay);
      lYear = lunar.lunarYear;
      lMonth = lunar.lunarMonth;
      lDay = lunar.lunarDay;
    } else {
      const solar = lunarToSolar(lYear, lMonth, lDay);
      sYear = solar.year;
      sMonth = solar.month;
      sDay = solar.day;
    }

    const hIdx = f.hourIdx !== '' ? parseInt(f.hourIdx, 10) : null;
    const pillars = calculatePillars(sYear, sMonth, sDay, hIdx);
    const hexNums = calculateDestinyHexNumbers(lYear, lMonth, lDay, hIdx);

    const uMod = hexNums.upperTrigramId;
    const lMod = hexNums.lowerTrigramId;
    const palaceInfo = findPalaceAndShi(uMod, lMod);
    const sixBeasts = getSixBeasts(pillars.dayStem);

    const innerNaJia = NAJIA_TABLE[lMod].inner;
    const outerNaJia = NAJIA_TABLE[uMod].outer;
    const allBranches = [...innerNaJia, ...outerNaJia];

    const getBits = (bin) => bin.split('').map(Number);
    const lBits = getBits(TRIGRAMS[lMod].binary);
    const uBits = getBits(TRIGRAMS[uMod].binary);
    const allLinesBits = [lBits[2], lBits[1], lBits[0], uBits[2], uBits[1], uBits[0]];

    const linesData = [];
    for (let i = 0; i < 6; i++) {
      const lineNum = i + 1;
      const bit = allLinesBits[i];
      const branch = allBranches[i];
      const wuxing = BRANCH_WUXING[branch];
      const relation = getRelation(palaceInfo.palaceWuxing, wuxing);
      const beast = sixBeasts[i];

      linesData.push({
        lineNum,
        bit,
        branch,
        wuxing,
        relation,
        beast,
        isShi: palaceInfo.shi === lineNum,
        isYing: palaceInfo.ying === lineNum
      });
    }

    const originalHex = getHexData(uMod, lMod);
    const nuclearHex = findNuclearHexagram(uMod, lMod);

    const report = generateDestinyReport({
      birthdayStr: `${f.year}年${f.month}月${f.day}日`,
      calendarType: f.calendarType,
      hasHour: hIdx !== null,
      hourBranch: hIdx !== null ? BRANCHES[hIdx] : null,
      pillars,
      originalHex,
      nuclearHex,
      palaceInfo,
      linesData
    });

    const fullResult = {
      ...report,
      name: f.name || '命主',
      gender: f.gender,
      uTrigram: TRIGRAMS[uMod],
      lTrigram: TRIGRAMS[lMod],
      linesData,
      palaceInfo
    };

    if (!formOverride) {
      setDestinyReport(fullResult);
    }
    return fullResult;
  };

  // -------------------------------------------------------------
  // 雙人合盤：計算並生成報告
  // -------------------------------------------------------------
  const handleGeneratePair = () => {
    const reportA = handleGenerateDestiny(pairForm.personA);
    const reportB = handleGenerateDestiny(pairForm.personB);

    const compat = generateCompatibilityReport({
      personA: {
        name: pairForm.personA.name || '甲方',
        shiLine: reportA.linesData.find(l => l.isShi),
        palaceInfo: reportA.palaceInfo,
        hexName: reportA.hexagrams.original.name,
        report: reportA
      },
      personB: {
        name: pairForm.personB.name || '乙方',
        shiLine: reportB.linesData.find(l => l.isShi),
        palaceInfo: reportB.palaceInfo,
        hexName: reportB.hexagrams.original.name,
        report: reportB
      }
    });

    setPairReport({
      personA: reportA,
      personB: reportB,
      compat
    });
  };

  const copyToClipboard = (text, message = '已複製到剪貼簿！') => {
    navigator.clipboard.writeText(text);
    setCopiedText(message);
    setTimeout(() => setCopiedText(''), 2500);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-serif selection:bg-stone-800 selection:text-white">
      {/* 頁首標題 */}
      <header className="bg-stone-900 text-stone-100 border-b-4 border-amber-600 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-amber-500 font-sans tracking-widest text-xs uppercase mb-1">
              <span>周易天地</span>
              <span>•</span>
              <span>梅花神數</span>
              <span>•</span>
              <span>文王六爻課</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide text-white flex items-center gap-2">
              易數神策 ‧ 命理排盤系統
            </h1>
            <p className="text-stone-400 text-sm mt-1">
              一事一占精準斷吉凶 ‧ 個人終身命理大運報告 ‧ 雙人命卦合盤相處全解
            </p>
          </div>

          {/* 系統分頁切換按鈕 */}
          <nav className="flex rounded-lg overflow-hidden border border-stone-700 bg-stone-800 p-1">
            <button
              onClick={() => setActiveTab(1)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-bold transition-all ${
                activeTab === 1 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              一事一占
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-bold transition-all ${
                activeTab === 2 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              個人終身卦
            </button>
            <button
              onClick={() => setActiveTab(3)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-bold transition-all ${
                activeTab === 3 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
            >
              <Users className="w-4 h-4" />
              雙人命卦合盤
            </button>
          </nav>
        </div>
      </header>

      {/* 提示訊息 */}
      {copiedText && (
        <div className="fixed top-4 right-4 z-50 bg-stone-900 text-amber-400 border border-amber-500 px-4 py-2 rounded-lg shadow-xl text-sm font-sans flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {copiedText}
        </div>
      )}

      {/* 主要內容容器 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* ========================================================= */}
        {/* TAB 1: 一事一占 */}
        {/* ========================================================= */}
        {activeTab === 1 && (
          <div className="space-y-8 animate-fadeIn">
            {/* 說明引言 */}
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg text-stone-800 text-sm leading-relaxed shadow-sm">
              <span className="font-bold text-amber-900">【一事一占說明】：</span>
              梅花起卦法配合六爻納甲排盤。請心懷所問之事，輸入三個直覺靈感數字（例如：3, 4, 5）。
              系統將自動排出四柱干支、主卦、變卦、互卦，並根據六爻旺衰、動變生剋及回頭生剋進行加權評分，輸出吉凶等級與詳細白話評語。
            </div>

            {/* 起卦輸入卡片 */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-6">
              <h2 className="text-xl font-bold text-stone-800 border-b border-stone-200 pb-3 flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-600" />
                起卦參數與問事登記
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    占卜日期
                  </label>
                  <input
                    type="date"
                    value={divDateStr}
                    onChange={(e) => setDivDateStr(e.target.value)}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded font-sans text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    占卜時辰
                  </label>
                  <select
                    value={divHourIdx}
                    onChange={(e) => setDivHourIdx(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded font-sans text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {BRANCHES.map((b, i) => (
                      <option key={i} value={i}>
                        {b}時 ({i === 0 ? '23:00 - 01:00' : `${i * 2 - 1}:00 - ${i * 2 + 1}:00`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">占問主題（自動定用神）</label>
                  <select
                    value={divTopic}
                    onChange={(e) => setDivTopic(e.target.value)}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded font-sans text-sm font-bold text-amber-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="財運">財運（以妻財為用神）</option>
                    <option value="事業">事業/工作/升遷（以官鬼為用神）</option>
                    <option value="感情">感情/婚姻（男看妻財/女看官鬼）</option>
                    <option value="學業">學業/考運/證照（以父母為用神）</option>
                    <option value="健康">健康/長輩平安（以父母為用神）</option>
                    <option value="子女">子女/福氣/解憂（以子孫為用神）</option>
                    <option value="合夥">合夥/合作/競爭（以兄弟為用神）</option>
                  </select>
                </div>

                {/* 當前四柱速覽 */}
                <div className="md:col-span-3 text-xs md:text-sm text-stone-600 bg-white p-3 rounded border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    四柱：
                    <span className="font-bold text-stone-900 mx-1">{currentPillars.year}年</span>
                    <span className="font-bold text-stone-900 mx-1">{currentPillars.month}月</span>
                    <span className="font-bold text-stone-900 mx-1">{currentPillars.day}日</span>
                    <span className="font-bold text-stone-900 mx-1">{currentPillars.hour}時</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>旬空：<strong className="text-amber-700">{currentPillars.kongWang.join('、')}</strong></span>
                    <span>月破：<strong className="text-rose-600">{currentPillars.yuePoBranch}</strong></span>
                    <span>日破：<strong className="text-purple-600">{currentPillars.riPoBranch}</strong></span>
                  </div>
                </div>
              </div>

              {/* 問事與數字輸入 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">具體占問事項（心誠則靈）</label>
                  <input
                    type="text"
                    value={divQuestion}
                    onChange={(e) => setDivQuestion(e.target.value)}
                    placeholder="例如：今年是否適合換工作至外商公司？或者這筆投資下半年回報如何？"
                    className="w-full p-3 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                  <div className="text-xs font-bold text-stone-600 mb-2">輸入三個心念數字（數字1除以8定上卦、數字2除以8定下卦、數字3除以6定動爻）：</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      value={divInputs.num1}
                      onChange={(e) => setDivInputs({ ...divInputs, num1: e.target.value })}
                      placeholder="數字一 (上卦)"
                      className="w-36 p-3 bg-white border border-stone-300 rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <span className="text-stone-400 font-bold">+</span>
                    <input
                      type="number"
                      value={divInputs.num2}
                      onChange={(e) => setDivInputs({ ...divInputs, num2: e.target.value })}
                      placeholder="數字二 (下卦)"
                      className="w-36 p-3 bg-white border border-stone-300 rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <span className="text-stone-400 font-bold">+</span>
                    <input
                      type="number"
                      value={divInputs.num3}
                      onChange={(e) => setDivInputs({ ...divInputs, num3: e.target.value })}
                      placeholder="數字三 (動爻)"
                      className="w-36 p-3 bg-white border border-stone-300 rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />

                    <button
                      onClick={handleDivinationCalculate}
                      className="ml-auto bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-600 px-8 py-3 rounded-lg font-bold text-base shadow hover:shadow-md transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      起卦排盤 ‧ 吉凶推斷
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 一事一占：排盤結果與斷語分析 */}
            {divResult && (
              <div className="space-y-6">
                {/* 頂部吉凶大看板 */}
                <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                  <div className="bg-stone-900 text-stone-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-amber-400 tracking-wider">占問【{divResult.topic}】：{divResult.question || '一般推斷'}</div>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white mt-1 flex items-center gap-3">
                        <span>{divResult.originalHex.name}</span>
                        <span className="text-stone-500 font-normal text-xl">之</span>
                        <span className="text-amber-400">{divResult.changedHex.name}</span>
                      </h3>
                      <div className="text-xs text-stone-400 mt-2 flex items-center gap-4">
                        <span>卦宮：{divResult.palaceInfo.palaceName}宮 ({divResult.palaceInfo.palaceWuxing}行)</span>
                        <span>互卦：{divResult.nuclearHex.hex.name}</span>
                        <span>動爻：第 {divResult.moving} 爻</span>
                      </div>
                    </div>

                    {/* 吉凶等級徽章 */}
                    <div className="flex flex-col items-center justify-center bg-stone-800 border border-stone-700 px-6 py-4 rounded-xl min-w-[160px]">
                      <div className="text-xs text-stone-400 mb-1">吉凶斷定</div>
                      <span className={`px-4 py-1.5 rounded-full text-xl font-black shadow ${divResult.evaluation.badgeClass}`}>
                        【{divResult.evaluation.level}】
                      </span>
                      <div className="text-xs text-stone-300 mt-1 font-sans">
                        綜合卦氣評分：<strong className="text-amber-400">{divResult.evaluation.score}</strong> 分
                      </div>
                    </div>
                  </div>

                  {/* 斷卦白話詳細評語 */}
                  <div className="p-6 bg-stone-50 border-t border-stone-200 space-y-4">
                    <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-600" />
                      白話文綜合斷語與行動建議
                    </h4>
                    <div className="text-stone-800 text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                      {divResult.evaluation.fullCommentary}
                    </div>

                    {/* 亮點與警示細項 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          吉相加分要素
                        </div>
                        {divResult.evaluation.strengths.length > 0 ? (
                          <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
                            {divResult.evaluation.strengths.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 italic">當前盤面平順，少見明顯特殊大助力。</p>
                        )}
                      </div>

                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5 mb-2">
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                          凶相與風險警示
                        </div>
                        {divResult.evaluation.warnings.length > 0 ? (
                          <ul className="text-xs text-rose-800 space-y-1.5 list-disc list-inside">
                            {divResult.evaluation.warnings.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-rose-700 italic">當前盤面無重大剋破或凶煞干擾。</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 六爻詳細納甲盤面表格 */}
                <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                  <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex items-center justify-between">
                    <span className="font-bold text-stone-800 text-sm">六爻全景納甲排盤 (從上爻至初爻)</span>
                    <span className="text-xs text-stone-500">
                      用神：<strong className="text-indigo-600">{divResult.evaluation.yongShen.name}</strong> ({divResult.evaluation.yongShen.wuxing}・{divResult.evaluation.yongShen.status}氣)
                    </span>
                  </div>

                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-sm border-collapse min-w-[640px]">
                      <thead>
                        <tr className="border-b border-stone-200 text-xs text-stone-500">
                          <th className="py-2 px-3">六神</th>
                          <th className="py-2 px-3">六親標註</th>
                          <th className="py-2 px-3">本卦爻象</th>
                          <th className="py-2 px-3">干支五行</th>
                          <th className="py-2 px-3 text-center">卦爻符號 (本 ➔ 變)</th>
                          <th className="py-2 px-3">動變與回頭作用</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {[...divResult.linesData].reverse().map((line, idx) => (
                          <tr 
                            key={idx}
                            className={`hover:bg-stone-50 transition-colors ${
                              line.isMoving ? 'bg-amber-50/60' : ''
                            } ${line.isYongShen ? 'bg-indigo-50/50' : ''}`}
                          >
                            <td className="py-2.5 px-3 font-medium text-xs text-stone-600">
                              {line.beast}
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="font-bold text-stone-800">{line.relation}</span>
                              {line.isShi && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white shadow-sm">世</span>
                              )}
                              {line.isYing && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-blue-600 text-white shadow-sm">應</span>
                              )}
                              {line.isKongWang && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-amber-600 text-white">空</span>
                              )}
                              {line.isYuePo && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-purple-600 text-white">月破</span>
                              )}
                              {line.isYongShen && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black bg-indigo-600 text-white">用神</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-xs text-stone-600">
                              第 {line.lineNum} 爻 ({line.bit === 1 ? '陽' : '陰'})
                            </td>

                            <td className="py-2.5 px-3 font-mono font-bold text-stone-700">
                              {line.branch}{line.wuxing}
                            </td>

                            {/* 爻符號繪製 */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-3">
                                <div className="w-16 flex justify-between">
                                  {line.bit === 1 ? (
                                    <div className="w-full h-2.5 bg-stone-800 rounded-sm"></div>
                                  ) : (
                                    <>
                                      <div className="w-[45%] h-2.5 bg-stone-800 rounded-sm"></div>
                                      <div className="w-[45%] h-2.5 bg-stone-800 rounded-sm"></div>
                                    </>
                                  )}
                                </div>
                                <span className="text-stone-300 text-xs">➔</span>
                                <div className="w-16 flex justify-between opacity-70">
                                  {line.isMoving ? (
                                    line.bit === 1 ? (
                                      <>
                                        <div className="w-[45%] h-2.5 bg-amber-600 rounded-sm"></div>
                                        <div className="w-[45%] h-2.5 bg-amber-600 rounded-sm"></div>
                                      </>
                                    ) : (
                                      <div className="w-full h-2.5 bg-amber-600 rounded-sm"></div>
                                    )
                                  ) : (
                                    line.bit === 1 ? (
                                      <div className="w-full h-2.5 bg-stone-300 rounded-sm"></div>
                                    ) : (
                                      <>
                                        <div className="w-[45%] h-2.5 bg-stone-300 rounded-sm"></div>
                                        <div className="w-[45%] h-2.5 bg-stone-300 rounded-sm"></div>
                                      </>
                                    )
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 動變作用說明 */}
                            <td className="py-2.5 px-3 text-xs">
                              {line.isMoving && line.changed ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-amber-900">
                                    動化: {line.changed.relation} {line.changed.branch}{line.changed.wuxing}
                                  </div>
                                  <div className="text-stone-600 text-[11px]">
                                    ({line.changed.interact}本爻
                                    {line.changed.specialInteract && (
                                      <span className="ml-1 text-rose-600 font-bold">・{line.changed.specialInteract}</span>
                                    )})
                                  </div>
                                </div>
                              ) : (
                                <span className="text-stone-400 text-xs">安靜</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI 提示詞導出卡片 */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      匯出給其他大型語言模型 (ChatGPT / Claude / Gemini)
                    </h5>
                    <p className="text-xs text-indigo-700 mt-1">
                      本系統已為您格式化完整的六爻干支、用神、動變與卦辭資訊，可一鍵複製向其他 AI 追問更深層次細節。
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(aiPromptText, '已成功複製 AI 命理提示詞！')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Copy className="w-4 h-4" />
                    一鍵複製 AI 提示詞
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 個人終身卦 */}
        {/* ========================================================= */}
        {activeTab === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg text-stone-800 text-sm leading-relaxed shadow-sm">
              <span className="font-bold text-amber-900">【終身卦命理分析說明】：</span>
              以宋代邵康節先生《梅花易數》先天八卦與天地人起卦法為綱，結合六爻納甲世爻為命主核心。
              支援國曆與農曆生日換算（可不需時辰）。系統將為您生成一份極其詳盡的「個人終身命理報告」，涵蓋天賦格局、性格身心盲區、一生財庫、事業方位與相應之開運秘笈。
            </div>

            {/* 生日輸入表單 */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-6">
              <h2 className="text-xl font-bold text-stone-800 border-b border-stone-200 pb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                登記生辰八字與曆法資訊
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">姓名 / 稱謂</label>
                  <input
                    type="text"
                    value={destinyForm.name}
                    onChange={(e) => setDestinyForm({ ...destinyForm, name: e.target.value })}
                    placeholder="例如：張先生 / 李小姐"
                    className="w-full p-2.5 border border-stone-300 rounded font-sans text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">生理性別</label>
                  <select
                    value={destinyForm.gender}
                    onChange={(e) => setDestinyForm({ ...destinyForm, gender: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded font-sans text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="男">男（乾造）</option>
                    <option value="女">女（坤造）</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">曆法種類</label>
                  <select
                    value={destinyForm.calendarType}
                    onChange={(e) => setDestinyForm({ ...destinyForm, calendarType: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded font-sans text-sm font-bold text-amber-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="solar">國曆（公曆 / 西元）</option>
                    <option value="lunar">農曆（陰曆 / 舊曆）</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    出生時辰（可不填）
                  </label>
                  <select
                    value={destinyForm.hourIdx}
                    onChange={(e) => setDestinyForm({ ...destinyForm, hourIdx: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded font-sans text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="">【不清楚 / 無時辰起卦】</option>
                    {BRANCHES.map((b, i) => (
                      <option key={i} value={i}>
                        {b}時 ({i === 0 ? '23:00 - 01:00' : `${i * 2 - 1}:00 - ${i * 2 + 1}:00`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 年月日選擇 */}
                <div className="md:col-span-4 grid grid-cols-3 gap-3 bg-stone-50 p-4 rounded-lg border border-stone-200">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">出生年 (西元)</label>
                    <input
                      type="number"
                      min="1910"
                      max="2035"
                      value={destinyForm.year}
                      onChange={(e) => setDestinyForm({ ...destinyForm, year: e.target.value })}
                      className="w-full p-2.5 bg-white border border-stone-300 rounded text-center font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">月份</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={destinyForm.month}
                      onChange={(e) => setDestinyForm({ ...destinyForm, month: e.target.value })}
                      className="w-full p-2.5 bg-white border border-stone-300 rounded text-center font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">日期</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={destinyForm.day}
                      onChange={(e) => setDestinyForm({ ...destinyForm, day: e.target.value })}
                      className="w-full p-2.5 bg-white border border-stone-300 rounded text-center font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleGenerateDestiny()}
                  className="bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-600 px-8 py-3 rounded-lg font-bold text-base shadow hover:shadow-md transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  生成個人終身命理報告
                </button>
              </div>
            </div>

            {/* 終身命卦深度報告展示 */}
            {destinyReport && (
              <div className="space-y-6">
                {/* 報告首頁大看板 */}
                <div className="bg-stone-900 text-stone-100 rounded-xl p-6 md:p-8 shadow-lg border-2 border-amber-600 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <div className="inline-block bg-amber-600/30 text-amber-400 text-xs px-3 py-1 rounded-full border border-amber-500/40 mb-2">
                        {destinyReport.name} 的終身命卦總策 ‧ {destinyReport.meta.calendarType}生辰
                      </div>
                      <h3 className="text-3xl md:text-4xl font-extrabold text-white">
                        本命命卦：{destinyReport.hexagrams.original.name}
                      </h3>
                      <p className="text-stone-300 text-sm mt-2 max-w-xl">
                        {destinyReport.hexagrams.original.vernacularText}
                      </p>
                    </div>

                    <div className="bg-stone-800/80 p-4 rounded-xl border border-stone-700 text-xs space-y-1.5 min-w-[220px]">
                      <div>四柱八字：<strong className="text-amber-300">{destinyReport.meta.pillars}</strong></div>
                      <div>宮位歸屬：<strong className="text-stone-200">{destinyReport.hexagrams.palace}</strong></div>
                      <div>互卦演變：<strong className="text-stone-200">{destinyReport.hexagrams.nuclear.hex.name}</strong></div>
                      <div>世爻定位：<strong className="text-rose-400">{destinyReport.hexagrams.shiPosition}</strong></div>
                      <div>旬空地支：<strong className="text-amber-400">{destinyReport.meta.kongWang || '無'}</strong></div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-800 flex justify-end">
                    <button
                      onClick={() => {
                        const text = `【${destinyReport.name} 終身命理報告】\n命卦：${destinyReport.hexagrams.original.name} (${destinyReport.hexagrams.palace})\n性格：${destinyReport.personality.wuxingArchetype.title}\n${destinyReport.personality.coreMindset}\n\n天賦事業：\n${destinyReport.career.roleOrientation}\n推薦行業：${destinyReport.career.recommendedIndustries.join('、')}\n\n一生財運：\n${destinyReport.wealth.wealthPattern}\n${destinyReport.wealth.caiYaoPresence}\n\n健康養生：\n易感臟腑：${destinyReport.health.organSystem}\n調養建議：${destinyReport.health.nurtureTips}\n\n開運錦囊：\n幸運色：${destinyReport.luckyKit.color} | 開運數：${destinyReport.luckyKit.numbers} | 吉方：${destinyReport.luckyKit.direction}\n人生座右銘：${destinyReport.luckyKit.motto}`;
                        copyToClipboard(text, '已複製完整個人終身命理報告！');
                      }}
                      className="bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      複製整份報告文本
                    </button>
                  </div>
                </div>

                {/* 章節一：性格與心性特質 */}
                <div className="bg-white rounded-xl shadow border border-stone-200 p-6 space-y-4">
                  <h4 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600" />
                    第一章 ‧ 核心心性與性格特質
                  </h4>
                  
                  <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <div className="font-bold text-stone-800 text-base mb-1">
                      {destinyReport.personality.wuxingArchetype.title}
                    </div>
                    <p className="text-stone-700 text-sm leading-relaxed">
                      {destinyReport.personality.wuxingArchetype.desc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-1.5">
                      <div className="font-bold text-stone-900 text-xs uppercase tracking-wider text-amber-800">
                        【內在驅力 ‧ 六親意向】
                      </div>
                      <p className="text-stone-700 leading-relaxed text-xs">
                        {destinyReport.personality.relationDrive}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-1.5">
                      <div className="font-bold text-stone-900 text-xs uppercase tracking-wider text-amber-800">
                        【處世風骨 ‧ 六神氣場】
                      </div>
                      <p className="text-stone-700 leading-relaxed text-xs">
                        {destinyReport.personality.beastManner}
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4">
                    <div className="font-bold text-amber-900 text-xs flex items-center gap-1 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      性格盲點與心性修為指引
                    </div>
                    <p className="text-amber-800 text-xs leading-relaxed">
                      {destinyReport.personality.blindSpots}
                    </p>
                  </div>
                </div>

                {/* 章節二：天賦事業與職業發展 */}
                <div className="bg-white rounded-xl shadow border border-stone-200 p-6 space-y-4">
                  <h4 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    第二章 ‧ 天賦天職與畢生事業發展
                  </h4>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 text-sm leading-relaxed">
                    <div className="font-bold text-blue-950 mb-1">天賦職能定位：</div>
                    {destinyReport.career.roleOrientation}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-stone-500 mb-2">五行利基產業推薦（具備得心應手之天賦優勢）：</div>
                    <div className="flex flex-wrap gap-2">
                      {destinyReport.career.recommendedIndustries.map((ind, i) => (
                        <span key={i} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-xs font-bold border border-stone-300">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-stone-600 text-xs leading-relaxed pt-2">
                    {destinyReport.career.workStrategy}
                  </p>
                </div>

                {/* 章節三：一生財運與財庫格局 */}
                <div className="bg-white rounded-xl shadow border border-stone-200 p-6 space-y-4">
                  <h4 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    第三章 ‧ 一生財帛與聚財防漏格局
                  </h4>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm leading-relaxed">
                    {destinyReport.wealth.wealthPattern}
                  </div>

                  <div className="text-stone-700 text-xs space-y-2 bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <div><strong>財源基底：</strong> {destinyReport.wealth.caiYaoPresence}</div>
                    <div><strong>守財指南：</strong> {destinyReport.wealth.wealthAdvice}</div>
                  </div>
                </div>

                {/* 章節四：人際感情與健康養生 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow border border-stone-200 p-6 space-y-3">
                    <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2 text-base">
                      <Heart className="w-4 h-4 text-rose-600" />
                      第四章 ‧ 感情婚姻與家庭模式
                    </h4>
                    <p className="text-stone-700 text-xs leading-relaxed">
                      {destinyReport.relationship.shiYingDynamic}
                    </p>
                    <p className="text-stone-500 text-xs italic">
                      相處箴言：{destinyReport.relationship.romanceAdvice}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow border border-stone-200 p-6 space-y-3">
                    <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2 text-base">
                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                      第五章 ‧ 身心五行養生調理
                    </h4>
                    <div className="text-xs space-y-1 text-stone-700">
                      <div><strong>易感經絡臟腑：</strong> {destinyReport.health.organSystem}</div>
                      <div><strong>調養平衡建議：</strong> {destinyReport.health.nurtureTips}</div>
                    </div>
                  </div>
                </div>

                {/* 章節五：開運錦囊 */}
                <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-xl p-6 shadow-md border border-stone-700 space-y-4">
                  <h4 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    終身開運錦囊 ‧ 能量加持
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-stone-800/80 p-3 rounded border border-stone-700">
                      <span className="text-stone-400 block mb-1">幸運開運色系</span>
                      <strong className="text-amber-300 text-sm">{destinyReport.luckyKit.color}</strong>
                    </div>
                    <div className="bg-stone-800/80 p-3 rounded border border-stone-700">
                      <span className="text-stone-400 block mb-1">吉利開運數字</span>
                      <strong className="text-amber-300 text-sm">{destinyReport.luckyKit.numbers}</strong>
                    </div>
                    <div className="bg-stone-800/80 p-3 rounded border border-stone-700">
                      <span className="text-stone-400 block mb-1">貴人生旺方位</span>
                      <strong className="text-amber-300 text-sm">{destinyReport.luckyKit.direction}</strong>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-stone-300 border-t border-stone-800">
                    {destinyReport.luckyKit.motto}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: 雙人命卦合盤 */}
        {/* ========================================================= */}
        {activeTab === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg text-stone-800 text-sm leading-relaxed shadow-sm">
              <span className="font-bold text-amber-900">【雙人命卦合盤說明】：</span>
              輸入甲、乙雙方的生日時辰（時辰可留空），系統將分別排出雙方之命卦世爻、卦宮與六親神煞。
              重點剖析**「兩人五行能量生剋、思維差異與潛在地雷區」**，並量身輸出**「雙方該如何具體相處、彼此退讓與溝通昇華之道」**。
            </div>

            {/* 雙人生日輸入雙欄卡片 */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-6">
              <h2 className="text-xl font-bold text-stone-800 border-b border-stone-200 pb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                輸入雙方生辰八字
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 甲方資料 */}
                <div className="bg-stone-50 p-5 rounded-xl border-2 border-stone-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-2">
                    <span className="font-bold text-stone-900 text-base flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      甲方個人資料
                    </span>
                    <span className="text-xs text-stone-500 font-sans">第一位伴侶/合夥人</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">姓名 / 暱稱</label>
                      <input
                        type="text"
                        value={pairForm.personA.name}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personA: { ...pairForm.personA, name: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">性別</label>
                      <select
                        value={pairForm.personA.gender}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personA: { ...pairForm.personA, gender: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-sm"
                      >
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">曆法種類</label>
                      <select
                        value={pairForm.personA.calendarType}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personA: { ...pairForm.personA, calendarType: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-bold text-stone-800"
                      >
                        <option value="solar">國曆（公曆）</option>
                        <option value="lunar">農曆（陰曆）</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">出生時辰</label>
                      <select
                        value={pairForm.personA.hourIdx}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personA: { ...pairForm.personA, hourIdx: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-xs"
                      >
                        <option value="">【無時辰】</option>
                        {BRANCHES.map((b, i) => (
                          <option key={i} value={i}>{b}時 ({i===0?'23-01':`${i*2-1}-${i*2+1}`})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="年"
                      value={pairForm.personA.year}
                      onChange={(e) => setPairForm({
                        ...pairForm,
                        personA: { ...pairForm.personA, year: e.target.value }
                      })}
                      className="p-2 bg-white border border-stone-300 rounded text-center text-xs font-bold"
                    />
                    <input
                      type="number"
                      placeholder="月"
                      value={pairForm.personA.month}
                      onChange={(e) => setPairForm({
                        ...pairForm,
                        personA: { ...pairForm.personA, month: e.target.value }
                      })}
                      className="p-2 bg-white border border-stone-300 rounded text-center text-xs font-bold"
                    />
                    <input
                      type="number"
                      placeholder="日"
                      value={pairForm.personA.day}
                      onChange={(e) => setPairForm({
                        ...pairForm,
                        personA: { ...pairForm.personA, day: e.target.value }
                      })}
                      className="p-2 bg-white border border-stone-300 rounded text-center text-xs font-bold"
                    />
                  </div>
                </div>

                {/* 乙方資料 */}
                <div className="bg-stone-50 p-5 rounded-xl border-2 border-stone-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-300 pb-2">
                    <span className="font-bold text-stone-900 text-base flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                      乙方個人資料
                    </span>
                    <span className="text-xs text-stone-500 font-sans">第二位伴侶/合夥人</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">姓名 / 暱稱</label>
                      <input
                        type="text"
                        value={pairForm.personB.name}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personB: { ...pairForm.personB, name: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">性別</label>
                      <select
                        value={pairForm.personB.gender}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personB: { ...pairForm.personB, gender: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-sm"
                      >
                        <option value="女">女</option>
                        <option value="男">男</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">曆法種類</label>
                      <select
                        value={pairForm.personB.calendarType}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personB: { ...pairForm.personB, calendarType: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-bold text-stone-800"
                      >
                        <option value="solar">國曆（公曆）</option>
                        <option value="lunar">農曆（陰曆）</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">出生時辰</label>
                      <select
                        value={pairForm.personB.hourIdx}
                        onChange={(e) => setPairForm({
                          ...pairForm,
                          personB: { ...pairForm.personB, hourIdx: e.target.value }
                        })}
                        className="w-full p-2 bg-white border border-stone-300 rounded text-xs"
                      >
                        <option value="">【無時辰】</option>
                        {BRANCHES.map((b, i) => (
                          <option key={i} value={i}>{b}時 ({i===0?'23-01':`${i*2-1}-${i*2+1}`})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="年"
                      value={pairForm.personB.year}
                      onChange={(e) => setPairForm({
                        ...pairForm,
                        personB: { ...pairForm.personB, year: e.target.value }
                      })}
                      className="p-2 bg-white border border-stone-300 rounded text-center text-xs font-bold"
                    />
                    <input
                      type="number"
                      placeholder="月"
                      value={pairForm.personB.month}
                      onChange={(e) => setPairForm({
                        ...pairForm,
                        personB: { ...pairForm.personB, month: e.target.value }
                      })}
                      className="p-2 bg-white border border-stone-300 rounded text-center text-xs font-bold"
                    />
                    <input
                      type="number"
                      placeholder="日"
                      value={pairForm.personB.day}
                      onChange={(e) => setPairForm({
                        ...pairForm,
                        personB: { ...pairForm.personB, day: e.target.value }
                      })}
                      className="p-2 bg-white border border-stone-300 rounded text-center text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGeneratePair}
                  className="bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-600 px-8 py-3 rounded-lg font-bold text-base shadow hover:shadow-md transition-all flex items-center gap-2"
                >
                  <Users className="w-5 h-5 text-amber-400" />
                  排出雙人命卦 ‧ 深度相處合盤
                </button>
              </div>
            </div>

            {/* 雙人合盤深度分析展示 */}
            {pairReport && (
              <div className="space-y-6">
                {/* 頂部契合度總評板 */}
                <div className="bg-stone-900 text-white rounded-xl p-6 md:p-8 shadow-lg border-2 border-amber-600 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="text-xs text-amber-400 tracking-wider">
                      {pairReport.personA.name} 與 {pairReport.personB.name} 的命卦配對總覽
                    </div>
                    <h3 className="text-3xl font-extrabold mt-1 text-white flex items-center gap-3">
                      <span>{pairReport.compat.tier}</span>
                      <span className="text-amber-400 text-xl font-normal tracking-widest">
                        {pairReport.compat.stars}
                      </span>
                    </h3>
                    <p className="text-stone-300 text-sm mt-2 max-w-xl leading-relaxed">
                      {pairReport.compat.dynamicSummary}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-stone-800 border border-stone-700 px-6 py-4 rounded-xl min-w-[170px]">
                    <div className="text-xs text-stone-400 mb-1">整體契合度指數</div>
                    <div className="text-4xl font-black text-amber-400 font-sans">
                      {pairReport.compat.score} <span className="text-base text-stone-400 font-normal">%</span>
                    </div>
                    <div className="text-[11px] text-stone-300 mt-1">易理五行權重運算</div>
                  </div>
                </div>

                {/* 雙方本命盤速覽對照表 */}
                <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                  <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 font-bold text-stone-800 text-sm">
                    雙方命盤核心要素並列對照
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-stone-200 p-4 text-xs">
                    {/* 甲方欄 */}
                    <div className="px-4 space-y-2">
                      <div className="font-bold text-blue-700 text-sm">【甲方：{pairReport.personA.name}】</div>
                      <div>命卦：<strong>{pairReport.personA.hexagrams.original.name}</strong> ({pairReport.personA.hexagrams.palace})</div>
                      <div>世爻五行：<strong className="text-stone-900">{pairReport.personA.linesData.find(l=>l.isShi).wuxing}行</strong></div>
                      <div>持世六親：<strong>{pairReport.personA.linesData.find(l=>l.isShi).relation}</strong></div>
                      <div>世爻臨神：<strong>{pairReport.personA.linesData.find(l=>l.isShi).beast}</strong></div>
                    </div>

                    {/* 乙方欄 */}
                    <div className="px-4 space-y-2">
                      <div className="font-bold text-rose-700 text-sm">【乙方：{pairReport.personB.name}】</div>
                      <div>命卦：<strong>{pairReport.personB.hexagrams.original.name}</strong> ({pairReport.personB.hexagrams.palace})</div>
                      <div>世爻五行：<strong className="text-stone-900">{pairReport.personB.linesData.find(l=>l.isShi).wuxing}行</strong></div>
                      <div>持世六親：<strong>{pairReport.personB.linesData.find(l=>l.isShi).relation}</strong></div>
                      <div>世爻臨神：<strong>{pairReport.personB.linesData.find(l=>l.isShi).beast}</strong></div>
                    </div>
                  </div>
                </div>

                {/* 兩人性格碰撞與摩擦地雷 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 相處優勢與默契火花 */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 space-y-3">
                    <h4 className="font-bold text-emerald-950 text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      相處優勢 ‧ 默契契合點
                    </h4>
                    <ul className="text-xs text-emerald-900 space-y-2 list-disc list-inside">
                      {pairReport.compat.synergyPoints.map((pt, i) => (
                        <li key={i} className="leading-relaxed">{pt}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 潛在地雷區 */}
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-5 space-y-3">
                    <h4 className="font-bold text-rose-950 text-base flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      相處潛在地雷 ‧ 容易摩擦處
                    </h4>
                    <ul className="text-xs text-rose-900 space-y-2 list-disc list-inside">
                      {pairReport.compat.frictionPoints.map((pt, i) => (
                        <li key={i} className="leading-relaxed">{pt}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 核心相處指引：給甲方的相處錦囊 */}
                <div className="bg-white rounded-xl shadow border border-blue-200 p-6 space-y-4">
                  <h4 className="text-base font-bold text-blue-900 border-b border-blue-100 pb-2 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-blue-600" />
                    💖 寫給【{pairReport.personA.name}】的專屬相處指南（如何對待與讀懂{pairReport.personB.name}）
                  </h4>
                  <div className="space-y-2.5 text-xs text-stone-700 leading-relaxed">
                    {pairReport.compat.adviceForA.map((adv, i) => (
                      <div key={i} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        {adv}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 核心相處指引：給乙方的相處錦囊 */}
                <div className="bg-white rounded-xl shadow border border-rose-200 p-6 space-y-4">
                  <h4 className="text-base font-bold text-rose-900 border-b border-rose-100 pb-2 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    💖 寫給【{pairReport.personB.name}】的專屬相處指南（如何對待與讀懂{pairReport.personA.name}）
                  </h4>
                  <div className="space-y-2.5 text-xs text-stone-700 leading-relaxed">
                    {pairReport.compat.adviceForB.map((adv, i) => (
                      <div key={i} className="bg-rose-50/50 p-3 rounded-lg border border-rose-100">
                        {adv}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 雙方溝通黃金法則 */}
                <div className="bg-stone-900 text-stone-100 rounded-xl p-6 shadow-md border border-stone-700 space-y-4">
                  <h4 className="text-base font-bold text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    雙方長久相處的黃金修煉法則
                  </h4>
                  <div className="space-y-2.5 text-xs text-stone-300 leading-relaxed">
                    {pairReport.compat.goldenRules.map((rule, i) => (
                      <div key={i} className="bg-stone-800 p-3 rounded-lg border border-stone-700">
                        {rule}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        const text = `【${pairReport.personA.name} 與 ${pairReport.personB.name} 命卦合盤相處報告】\n合盤等級：${pairReport.compat.tier} (${pairReport.compat.score}%)\n五行生剋：${pairReport.compat.dynamicSummary}\n\n給${pairReport.personA.name}的相處錦囊：\n${pairReport.compat.adviceForA.join('\n')}\n\n給${pairReport.personB.name}的相處錦囊：\n${pairReport.compat.adviceForB.join('\n')}\n\n雙方相處黃金法則：\n${pairReport.compat.goldenRules.join('\n')}`;
                        copyToClipboard(text, '已複製雙人命卦合盤報告！');
                      }}
                      className="bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-600 px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      複製雙人合盤報告
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* 頁尾版權與免責聲明 */}
      <footer className="mt-16 bg-stone-900 text-stone-400 text-xs py-8 border-t border-stone-800">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-2">
          <p className="text-stone-300 font-bold">易數神策 ‧ 易經梅花六爻排盤推斷系統</p>
          <p className="text-stone-500">
            本程式依據《易經》、《卜筮正宗》、《梅花易數》演算法構建，旨在提供人生哲思指引與人際溝通借鑑。
          </p>
          <p className="text-stone-600 font-sans text-[11px] pt-2">
            部署網址：https://den3do.github.io/ask5/ ‧ 純前端無伺服器架構
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DivinationApp;
