import React, { useState, useEffect, useMemo } from 'react';
import { TRIGRAMS, BRANCH_WUXING, WUXING_RELATION, NAJIA_TABLE, STEMS, BRANCHES } from './data/constants';
import { checkBranchInteraction, getRelation, getSixBeasts, findPalaceAndShi, getHexData, getHourStem, getKongWang } from './utils/iching';

const DivinationApp = () => {
  const [activeTab, setActiveTab] = useState(1);
  
  const [inputs, setInputs] = useState({ num1: '', num2: '', num3: '' });
  const [question, setQuestion] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [hourIdx, setHourIdx] = useState(new Date().getHours() >= 23 ? 0 : Math.ceil(new Date().getHours() / 2) % 12);
  const [result, setResult] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [topic, setTopic] = useState('');

  const pillars = useMemo(() => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const yOffset = (year - 1984) % 60;
    const yStem = STEMS[Math.abs(yOffset % 10)];
    const yBranch = BRANCHES[Math.abs(yOffset % 12)];
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
    const hBranch = BRANCHES[hourIdx];
    const hStem = getHourStem(dStem, hourIdx);
    const kongWang = getKongWang(dStem, dBranch);
    
    const month = d.getMonth();
    const day = d.getDate();
    let mBranchIdx, mStemIdx;
    
    const yearStemIdx = STEMS.indexOf(yStem);
    const yearBranchIdx = BRANCHES.indexOf(yBranch);
    
    const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    const solarTerms = [
      { month: 0, day: 6 }, { month: 0, day: 4 }, { month: 1, day: 4 }, { month: 1, day: 19 },
      { month: 2, day: 6 }, { month: 2, day: 21 }, { month: 3, day: 5 }, { month: 3, day: 20 },
      { month: 4, day: 6 }, { month: 4, day: 21 }, { month: 5, day: 6 }, { month: 5, day: 22 },
      { month: 6, day: 7 }, { month: 6, day: 23 }, { month: 7, day: 8 }, { month: 7, day: 23 },
      { month: 8, day: 8 }, { month: 8, day: 23 }, { month: 9, day: 8 }, { month: 9, day: 24 },
      { month: 10, day: 8 }, { month: 10, day: 22 }, { month: 11, day: 7 }, { month: 11, day: 22 }
    ];
    
    let lunarMonth = month;
    for (let i = 0; i < solarTerms.length; i += 2) {
      if (month === solarTerms[i].month && day < solarTerms[i].day) {
        lunarMonth = (month - 1 + 12) % 12;
        break;
      }
    }
    
    mBranchIdx = (yearBranchIdx + lunarMonth + 1) % 12;
    const mBranch = monthBranches[lunarMonth];
    
    const yearStemMod = yearStemIdx % 5;
    const monthStemStart = (yearStemMod * 2 + 1) % 10;
    mStemIdx = (monthStemStart + lunarMonth) % 10;
    const mStem = STEMS[mStemIdx];
    
    return {
      year: `${yStem}${yBranch}`,
      month: `${mStem}${mBranch}`,
      day: `${dStem}${dBranch}`,
      hour: `${hStem}${hBranch}`,
      dayStem: dStem,
      dayBranch: dBranch,
      yearBranch: yBranch,
      hourBranch: hBranch,
      kongWang
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

    const uMod = n1 % 8;
    const lMod = n2 % 8;
    const uTrigram = TRIGRAMS[uMod];
    const lTrigram = TRIGRAMS[lMod];
    let moving = n3 % 6;
    if (moving === 0) moving = 6;

    const getBits = (bin) => bin.split('').map(Number);
    const lBits = getBits(lTrigram.binary);
    const uBits = getBits(uTrigram.binary);
    const lineMap = {
      1: lBits[2], 2: lBits[1], 3: lBits[0],
      4: uBits[2], 5: uBits[1], 6: uBits[0]
    };

    let newLId = lMod;
    let newUId = uMod;
    const flip = (bit) => bit === 1 ? 0 : 1;
    let newLBits = [...lBits];
    let newUBits = [...uBits];

    if (moving <= 3) {
      const idx = 3 - moving;
      newLBits[idx] = flip(newLBits[idx]);
    } else {
      const idx = 6 - moving;
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
      const kongWang = getKongWang(pillars.dayStem, pillars.dayBranch);
      const isKongWang = kongWang.includes(branch);
      
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
          interact: interact,
          specialInteract: specialInteract
        };
      }

      linesData.push({
        lineNum, bit, branch, wuxing, relation, beast,
        isShi: palaceInfo.shi === lineNum,
        isYing: palaceInfo.ying === lineNum,
        isMoving: moving === lineNum,
        isKongWang,
        changed: changedData
      });
    }

    const hexInfo = getHexData(uMod, lMod);
    const newHexInfo = getHexData(newUId, newLId);

    const topicToRelation = {
      '財運': '妻財',
      '感情': '妻財',
      '事業': '官鬼',
      '健康': '父母',
      '學業': '父母',
      '官司': '官鬼',
      '出行': '父母',
      '其他': null
    };
    
    const targetRelation = topicToRelation[topic] || null;
    
    const linesDataWithYongShen = linesData.map(line => ({
      ...line,
      isYongShen: targetRelation ? line.relation === targetRelation : false
    }));

    setResult({
      uTrigram, lTrigram, newUTrigram, newLTrigram,
      palaceInfo, linesData: linesDataWithYongShen, moving,
      textData: { original: hexInfo, changed: newHexInfo, movingText: hexInfo.lines[moving-1] || "" },
      pillars,
      topic
    });
    setActiveTab(2);
  };

  useEffect(() => {
    if (!result) return;
    const { pillars, linesData, moving, uTrigram, lTrigram, newUTrigram, newLTrigram, palaceInfo, textData } = result;

    const linesStr = [...linesData].reverse().map(l => {
      const markers = [];
      if (l.isShi) markers.push('世');
      if (l.isYing) markers.push('應');
      if (l.isKongWang) markers.push('空');
      const baseStr = `第${l.lineNum}爻 ${l.bit===1?'陽':'陰'} ${l.beast} [${l.relation}] ${l.branch}${l.wuxing} ${markers.join('')}`;
      
      if (l.isMoving && l.changed) {
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
【空亡】：${pillars.kongWang.join('、') || '無'}

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
4. **空亡分析**：注意空亡地支對爻象的影響，空亡之爻力量減弱。
5. **動變後分析**：未來可能狀況
6. **具體建議**：針對問事給予指引。`;

    setPromptText(prompt);
  }, [result]);

  const TabButton = ({ num, label }) => (
    <button
      onClick={() => setActiveTab(num)}
      className={`px-8 py-4 text-xl font-bold transition-all ${
        activeTab === num 
          ? 'bg-stone-800 text-white border-b-2 border-stone-800' 
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-100 p-2 md:p-6 font-serif text-stone-900">
      <div className="max-w-4xl mx-auto border-b-2 border-stone-300 pb-4 mb-6">
        <h1 className="text-5xl font-bold text-stone-800">六爻全功能排盤</h1>
        <p className="text-stone-500 text-base">動變互化 ‧ 刑沖合害 ‧ 完整卦辭</p>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex border-b border-stone-300">
          <TabButton num={1} label="詢問" />
          <TabButton num={2} label="卦象" />
          <TabButton num={3} label="導出" />
        </div>
      </div>

      {activeTab === 1 && (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-stone-200 space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded border border-stone-100">
            <div>
              <label className="block text-base font-bold text-stone-500 mb-1">占卜日期</label>
              <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full p-3 border rounded text-base" />
            </div>
            <div>
              <label className="block text-base font-bold text-stone-500 mb-1">占卜時辰</label>
              <select value={hourIdx} onChange={e => setHourIdx(parseInt(e.target.value))} className="w-full p-3 border rounded text-base">
                {BRANCHES.map((b, i) => (
                  <option key={i} value={i}>{b}時 ({i===0?'23-01':(i*2-1)+'-'+(i*2+1)})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 text-center text-base text-stone-600">
               預排四柱：
               <span className="font-bold mx-1 text-base">{pillars.year} 年</span>
               <span className="font-bold mx-1 text-base">{pillars.month} 月</span>
               <span className="font-bold mx-1 text-base">{pillars.day} 日</span>
               <span className="font-bold mx-1 text-base">{pillars.hour} 時</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-base font-bold text-stone-500 mb-1">占事主題</label>
              <select 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded focus:border-stone-500 outline-none text-base"
              >
                <option value="">請選擇占事主題...</option>
                <option value="財運">財運</option>
                <option value="感情">感情</option>
                <option value="事業">事業</option>
                <option value="健康">健康</option>
                <option value="學業">學業</option>
                <option value="官司">官司</option>
                <option value="出行">出行</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <input 
              type="text" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="請輸入想問的事情..."
              className="w-full p-3 border border-stone-300 rounded focus:border-stone-500 outline-none text-base"
            />
            <div className="flex justify-center gap-2">
              <input type="number" name="num1" value={inputs.num1} onChange={e => setInputs({...inputs, num1: e.target.value})} placeholder="上卦" className="w-20 p-3 border rounded text-center text-xl" />
              <input type="number" name="num2" value={inputs.num2} onChange={e => setInputs({...inputs, num2: e.target.value})} placeholder="下卦" className="w-20 p-3 border rounded text-center text-xl" />
              <input type="number" name="num3" value={inputs.num3} onChange={e => setInputs({...inputs, num3: e.target.value})} placeholder="動爻" className="w-20 p-3 border rounded text-center text-xl" />
              <button onClick={handleCalculate} className="bg-stone-800 text-white px-8 py-3 rounded font-bold hover:bg-stone-700 text-xl">排盤</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 2 && result && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="bg-white shadow-xl border-2 border-stone-400 rounded-lg overflow-hidden">
            <div className="bg-stone-50 p-4 border-b border-stone-200 flex flex-wrap justify-between items-end">
               <div>
                 <div className="text-base text-stone-500 mb-1">{result.palaceInfo.palaceName}宮{result.palaceInfo.palaceWuxing}行</div>
                 <h2 className="text-2xl font-bold text-stone-800">
                   {result.textData.original.name} <span className="text-gray-400 text-2xl font-normal">之</span> {result.textData.changed.name}
                 </h2>
                 {result.topic && <div className="text-base text-indigo-600 font-bold mt-1">占事：{result.topic}</div>}
               </div>
               <div className="text-right text-base text-stone-400 mt-2 md:mt-0">
                 <div className="mb-1">
                   四柱：<span className="text-stone-600 font-bold text-2xl">{result.pillars.year}年 {result.pillars.month}月 {result.pillars.day}日 {result.pillars.hour}時</span>
                 </div>
                 <div>
                   動爻: <span className="text-red-600 font-bold text-2xl">{result.moving}</span> |
                   空亡: <span className="text-orange-600 font-bold text-2xl">{result.pillars.kongWang.join('、') || '無'}</span>
                 </div>
               </div>
            </div>

            <div className="p-4 md:p-8 overflow-x-auto">
              <div className="flex min-w-[600px] text-sm text-stone-400 border-b border-stone-100 pb-2 mb-2">
                <div className="w-20 pl-2">六獸</div>
                <div className="w-24">六親</div>
                <div className="w-20">干支</div>
                <div className="flex-1 text-center">卦爻 (本 &rarr; 變)</div>
                <div className="w-48 pl-4">動變解析 (刑沖合害)</div>
              </div>

              <div className="flex flex-col gap-2 min-w-[600px]">
                {[...result.linesData].reverse().map((line, idx) => (
                  <div key={idx} className={`flex items-center py-2 rounded border-b border-stone-50 ${line.isMoving ? 'bg-yellow-50' : ''} ${line.isYongShen ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''}`}>
                    <div className="w-20 pl-2 text-base font-medium" style={{
                      color: ['青龍','玄武'].includes(line.beast)?'green': ['朱雀'].includes(line.beast)?'red': ['白虎'].includes(line.beast)?'gray': 'brown'
                    }}>{line.beast}</div>

                    <div className="w-24 font-bold text-stone-700 relative text-base">
                      {line.relation}
                      {line.isShi && <span className="absolute -left-1 -top-1 text-xs text-white bg-red-500 px-1 rounded">世</span>}
                      {line.isYing && <span className="absolute -left-1 -top-1 text-xs text-white bg-blue-500 px-1 rounded">應</span>}
                      {line.isKongWang && <span className="absolute -right-1 -top-1 text-xs text-white bg-orange-500 px-1 rounded">空</span>}
                      {line.isYongShen && <span className="absolute -right-1 -top-1 text-xs text-white bg-indigo-600 px-1 rounded font-bold">用</span>}
                    </div>

                    <div className="w-20 text-stone-500 font-mono text-base">{line.branch}{line.wuxing}</div>

                    <div className="flex-1 flex justify-center items-center gap-4">
                      <div className="w-16 flex justify-between">
                         {line.bit===1 ? <div className="w-full h-3 bg-stone-800 rounded-sm"></div> : <><div className="w-[45%] h-3 bg-stone-800 rounded-sm"></div><div className="w-[45%] h-3 bg-stone-800 rounded-sm"></div></>}
                      </div>
                      <span className="text-stone-300 text-sm">➔</span>
                      <div className="w-16 flex justify-between opacity-60">
                         {line.isMoving ? (
                           line.bit===1 ? <><div className="w-[45%] h-3 bg-stone-400 rounded-sm"></div><div className="w-[45%] h-3 bg-stone-400 rounded-sm"></div></> : <div className="w-full h-3 bg-stone-400 rounded-sm"></div>
                         ) : (
                           line.bit===1 ? <div className="w-full h-3 bg-stone-200 rounded-sm"></div> : <><div className="w-[45%] h-3 bg-stone-200 rounded-sm"></div><div className="w-[45%] h-3 bg-stone-200 rounded-sm"></div></>
                         )}
                      </div>
                    </div>

                    <div className="w-48 pl-4 text-sm">
                      {line.isMoving && line.changed && (
                        <div className="animate-pulse">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500 text-sm">化 <span className="font-bold text-stone-800">{line.changed.branch}{line.changed.wuxing}</span></span>
                            <span className="font-bold text-indigo-600 text-sm">變 {line.changed.relation}</span>
                          </div>
                          <div className="mt-1 flex gap-1">
                            <span className="bg-stone-100 px-1 rounded text-stone-500 text-sm">{line.changed.interact}本爻</span>
                            {line.changed.specialInteract && (
                              <span className={`px-1 rounded font-bold text-white text-sm ${line.changed.specialInteract.includes('沖') ? 'bg-red-500' : 'bg-green-600'}`}>
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

          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-stone-800 mb-4 border-b border-stone-200 pb-2">卦象與爻辭解說</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-stone-700 text-lg mb-2">本卦：{result.textData.original.name}</h4>
                <p className="text-stone-600 text-base mt-1">{result.textData.original.text}</p>
                <p className="text-stone-500 text-sm mt-2 italic">白話解釋：這是起卦時的原始卦象，代表事情的初始狀態和基本趨勢。</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-700 text-lg mb-2">變卦：{result.textData.changed.name}</h4>
                <p className="text-stone-600 text-base mt-1">{result.textData.changed.text}</p>
                <p className="text-stone-500 text-sm mt-2 italic">白話解釋：這是動爻變化後的卦象，代表事情發展的結果和最終走向。</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-yellow-600 font-bold bg-yellow-200 px-2 py-1 rounded">動爻前</span>
                  <span className="text-base font-bold text-stone-700">第{result.moving}爻</span>
                </div>
                <p className="text-stone-700 text-base">{result.textData.original.lines[result.moving-1]}</p>
                <p className="text-stone-500 text-sm mt-2 italic">白話解釋：這是動爻變化前的爻辭，說明事情目前的狀況和需要注意的問題。</p>
              </div>
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-green-600 font-bold bg-green-200 px-2 py-1 rounded">動爻後</span>
                  <span className="text-base font-bold text-stone-700">第{result.moving}爻變化</span>
                </div>
                <p className="text-stone-700 text-base">{result.textData.changed.lines[result.moving-1]}</p>
                <p className="text-stone-500 text-sm mt-2 italic">白話解釋：這是動爻變化後的爻辭，預示事情發展的結果和應採取的行動。</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-stone-800 mb-4 border-b border-stone-200 pb-2">特殊關係分析</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-orange-50 p-4 rounded border border-orange-200">
                <h4 className="font-bold text-orange-800 mb-2 text-base">空亡</h4>
                <p className="text-base text-orange-700">{result.pillars.kongWang.join('、') || '無'}</p>
                <p className="text-sm text-orange-600 mt-1">空亡之爻力量減弱</p>
              </div>
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <h4 className="font-bold text-red-800 mb-2 text-base">相刑</h4>
                <p className="text-base text-red-700">
                  {result.linesData.filter(l => l.changed?.specialInteract?.includes('刑')).map(l => `第${l.lineNum}爻`).join('、') || '無'}
                </p>
                <p className="text-sm text-red-600 mt-1">刑傷不利</p>
              </div>
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <h4 className="font-bold text-green-800 mb-2 text-base">合局</h4>
                <p className="text-base text-green-700">
                  {result.linesData.filter(l => l.changed?.specialInteract?.includes('合')).map(l => `第${l.lineNum}爻`).join('、') || '無'}
                </p>
                <p className="text-sm text-green-600 mt-1">合局生旺</p>
              </div>
              <div className="bg-purple-50 p-4 rounded border border-purple-200">
                <h4 className="font-bold text-purple-800 mb-2 text-base">沖剋</h4>
                <p className="text-base text-purple-700">
                  {result.linesData.filter(l => l.changed?.specialInteract?.includes('沖')).map(l => `第${l.lineNum}爻`).join('、') || '無'}
                </p>
                <p className="text-sm text-purple-600 mt-1">沖剋動搖</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 3 && result && (
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-indigo-900 mb-2">🤖 AI 道長提示詞</h3>
            <textarea 
              readOnly 
              value={promptText}
              className="w-full h-64 p-3 text-sm bg-white border border-indigo-200 rounded focus:outline-none mb-2"
            />
            <button 
              onClick={() => {navigator.clipboard.writeText(promptText); alert("已複製！");}}
              className="bg-indigo-600 text-white px-4 py-2 rounded text-base hover:bg-indigo-700 w-full"
            >
              複製並詢問 AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DivinationApp;
