import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, BookOpen, Users, Calendar, Clock, Compass, Heart, 
  ShieldAlert, CheckCircle2, AlertCircle, Copy, RefreshCw, 
  Award, Briefcase, Coins, Flame, ChevronRight, HelpCircle,
  Settings, Bot, Star, Globe, Menu, X, Layers, HeartHandshake
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
import AiSettingsModal from './components/AiSettingsModal';
import SmartReading from './components/SmartReading';
import PersonalHub from './components/PersonalHub';
import SynastryReport from './components/SynastryReport';

const DivinationApp = () => {
  // 當前功能 Tab：1=一事一占, 2=個人命理（命卦/紫微/人類圖/西洋/融合）, 3=雙人合盤
  const [activeTab, setActiveTab] = useState(1);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const TABS = [
    { id: 1, label: '一事一占', Icon: Sparkles },
    { id: 2, label: '個人命理', Icon: Compass },
    { id: 3, label: '雙人合盤', Icon: HeartHandshake },
  ];

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
  const selectTab = (id) => {
    setActiveTab(id);
    setMenuOpen(false);
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
        <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-amber-500 font-sans tracking-widest text-xs uppercase mb-1">
                <span>周易天地</span><span>•</span><span>紫微斗數</span><span>•</span><span>西洋占星</span><span>•</span><span>人類圖</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-wide text-white truncate">
                易數神策 ‧ 命理排盤系統
              </h1>
              <p className="hidden md:block text-stone-400 text-sm mt-1">
                易經六爻 ‧ 紫微斗數 ‧ 西洋占星 ‧ 人類圖 ‧ 四維全象報告與雙人合盤
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-amber-500/40 bg-stone-800 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-sm font-bold shadow-md transition"
                title="設定 Google Gemini / OpenRouter API Key"
              >
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">AI 設定</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-stone-600 bg-stone-800 text-stone-100 text-sm font-bold"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label="開啟功能選單"
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span className="max-w-[7rem] truncate">{TABS.find((t) => t.id === activeTab)?.label}</span>
              </button>
            </div>
          </div>

          {/* 桌面版導覽 */}
          <nav className="hidden lg:flex flex-wrap gap-1 rounded-lg border border-stone-700 bg-stone-800 p-1" aria-label="功能分頁">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => selectTab(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-sm font-bold transition-all ${
                  activeTab === id ? 'bg-amber-600 text-white shadow' : 'text-stone-300 hover:text-white hover:bg-stone-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* 手機版漢堡選單 */}
          {menuOpen && (
            <nav id="mobile-nav" className="lg:hidden grid grid-cols-2 gap-2" aria-label="功能分頁">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-bold border ${
                    activeTab === id ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          )}
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

                {/* AI 即時深度斷卦區塊 */}
                <SmartReading
                  systemKey="iching"
                  prompt={aiPromptText}
                  onOpenSettings={() => setIsAiModalOpen(true)}
                />

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

        {activeTab === 2 && <PersonalHub onOpenSettings={() => setIsAiModalOpen(true)} />}
        {activeTab === 3 && <SynastryReport onOpenSettings={() => setIsAiModalOpen(true)} />}

      </main>

      {/* AI 設定彈窗 */}
      <AiSettingsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

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
