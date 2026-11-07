import React, { useState } from 'react';
import { Sparkles, Compass, Shield, User, Info, ArrowUpRight } from 'lucide-react';
import { ZIWEI_GRID_LAYOUT } from '../utils/ziwei';
import { describePalace } from '../utils/lifeReading';

const BRS = '子丑寅卯辰巳午未申酉戌亥';
const TONE_CLS = { good: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40', mid: 'bg-slate-600/30 text-slate-300 border-slate-500/40', bad: 'bg-rose-600/30 text-rose-300 border-rose-500/40' };
const TONE_LABEL = { good: '吉', mid: '平', bad: '凶' };

export default function ZiweiPlate({ astrolabeData, personName = '命主' }) {
  const [selectedBranch, setSelectedBranch] = useState(
    astrolabeData?.corePalaces?.soul?.earthlyBranch || '寅'
  );

  if (!astrolabeData) return null;

  const {
    raw,
    chineseDate,
    fiveElementsClass,
    soul,
    body,
    palacesByBranch,
  } = astrolabeData;

  const selectedPalace = palacesByBranch[selectedBranch];

  // 四化星顏色對應
  const getMutagenBadge = (mutagen) => {
    switch (mutagen) {
      case '祿':
        return <span className="bg-emerald-600 text-white text-[10px] px-1 py-0.2 rounded font-bold ml-1">祿</span>;
      case '權':
        return <span className="bg-amber-600 text-white text-[10px] px-1 py-0.2 rounded font-bold ml-1">權</span>;
      case '科':
        return <span className="bg-blue-600 text-white text-[10px] px-1 py-0.2 rounded font-bold ml-1">科</span>;
      case '忌':
        return <span className="bg-rose-600 text-white text-[10px] px-1 py-0.2 rounded font-bold ml-1">忌</span>;
      default:
        return null;
    }
  };

  // 星曜亮度顏色
  const getBrightnessClass = (brightness) => {
    if (['廟', '旺'].includes(brightness)) return 'text-amber-400 font-bold';
    if (['平', '利', '得'].includes(brightness)) return 'text-slate-300';
    if (['陷', '不'].includes(brightness)) return 'text-stone-500 italic';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6 animate-fade-in font-serif">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 font-sans bg-white/80 border border-stone-200 rounded-lg px-3 py-2">
        <span className="font-bold text-stone-800">圖例</span>
        <span className="flex items-center gap-1.5"><i className="inline-block w-4 h-3 rounded-sm border-2 border-amber-500" />選取的宮位</span>
        <span className="flex items-center gap-1.5"><i className="inline-block w-4 h-3 rounded-sm border-2 border-sky-400" />對宮（相互影響最強）</span>
        <span className="flex items-center gap-1.5"><i className="inline-block w-4 h-3 rounded-sm border-2 border-dashed border-sky-500" />三合宮（三方四正）</span>
        <span className="flex items-center gap-1.5"><b className="text-amber-500">金字</b>主星・<b className="text-cyan-600">青字</b>吉輔・<b className="text-rose-500">紅字</b>煞星</span>
        <span>祿權科忌＝生年四化・[廟旺]強、[陷]弱</span>
      </div>

      {/* 4x4 經典回字型命盤 */}
      <div className="bg-slate-950 p-3 sm:p-5 rounded-2xl border-2 border-amber-600/40 shadow-2xl overflow-x-auto">
        <div className="min-w-[780px] max-w-[960px] mx-auto grid grid-cols-4 grid-rows-4 gap-1.5 sm:gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          
          {/* 渲染 12 個外圍宮位 */}
          {ZIWEI_GRID_LAYOUT.map(({ branch, row, col }) => {
            const palace = palacesByBranch[branch];
            if (!palace) return null;

            const isSelected = selectedBranch === branch;
            const isSoul = palace.isOriginalPalace || palace.name === '命宮';
            const isBody = palace.isBodyPalace;
            const diff = (BRS.indexOf(branch) - BRS.indexOf(selectedBranch) + 12) % 12;
            const rel = diff === 6 ? 'opp' : diff === 4 || diff === 8 ? 'tri' : null;
            const oppStars = palacesByBranch[BRS[(BRS.indexOf(branch) + 6) % 12]]?.majorStars || [];

            // CSS grid-area 定位
            const style = {
              gridRowStart: row + 1,
              gridColumnStart: col + 1,
            };

            return (
              <div
                key={branch}
                style={style}
                onClick={() => setSelectedBranch(branch)}
                className={`relative flex flex-col justify-between p-2 sm:p-2.5 rounded-xl border cursor-pointer transition-all min-h-[170px] sm:min-h-[190px] text-sm select-none ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500'
                    : rel === 'opp'
                    ? 'bg-sky-950/30 border-sky-400 ring-1 ring-sky-400/70'
                    : rel === 'tri'
                    ? 'bg-sky-950/20 border-sky-500/70 border-dashed'
                    : isSoul
                    ? 'bg-red-950/20 border-red-500/40 hover:bg-slate-800/80 hover:border-slate-600'
                    : 'bg-slate-900/90 border-slate-800/90 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                {/* 宮位頂部標籤 */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                  <div className="flex items-center gap-1">
                    <span className={`font-extrabold text-base ${
                      isSoul ? 'text-red-400' : isSelected ? 'text-amber-300' : 'text-slate-200'
                    }`}>
                      {palace.name}
                    </span>
                    {isBody && (
                      <span className="bg-indigo-600/60 text-indigo-200 border border-indigo-400/40 text-[11px] px-1 rounded">
                        身
                      </span>
                    )}
                    {rel && !isSelected && (
                      <span className="text-[11px] px-1 rounded border border-sky-400/50 text-sky-300">{rel === 'opp' ? '對宮' : '三合'}</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-stone-300">
                    {palace.heavenlyStem}{palace.earthlyBranch}
                  </span>
                </div>

                {/* 主星群 (14主星) */}
                <div className="my-1.5 space-y-0.5">
                  {palace.majorStars.length > 0 ? (
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      {palace.majorStars.map((star, idx) => (
                        <div key={idx} className="flex items-center text-base">
                          <span className={`font-black ${
                            star.isMajor ? 'text-amber-300' : 'text-slate-200'
                          }`}>
                            {star.name}
                          </span>
                          {star.brightness && (
                            <span className={`text-xs ml-0.5 ${getBrightnessClass(star.brightness)}`}>
                              [{star.brightness}]
                            </span>
                          )}
                          {getMutagenBadge(star.mutagen)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-stone-400 text-xs italic">（無主星，借對宮：{oppStars.map((x) => x.name).join('、') || '無'}）</span>
                  )}
                </div>

                {/* 輔星、吉曜與煞曜 */}
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs leading-snug text-slate-300">
                  {palace.minorStars.map((star, idx) => (
                    <span key={idx} className={`${
                      ['擎羊', '陀羅', '火星', '鈴星', '天空', '地空', '地劫'].includes(star.name)
                        ? 'text-rose-400 font-semibold'
                        : ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲'].includes(star.name)
                        ? 'text-cyan-300 font-semibold'
                        : 'text-stone-400'
                    }`}>
                      {star.name}
                      {getMutagenBadge(star.mutagen)}
                    </span>
                  ))}
                  {palace.adjectiveStars.slice(0, 4).map((star, idx) => (
                    <span key={idx} className="text-stone-400 text-[11px]">
                      {star.name}
                    </span>
                  ))}
                </div>

                {/* 底部：大限區間與長生博士 */}
                <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs text-stone-400 font-sans">
                  <span>{palace.changsheng12}</span>
                  <span className="font-mono text-amber-400 font-bold text-sm">
                    {palace.decadal.range[0]}-{palace.decadal.range[1]}
                  </span>
                  <span>{palace.boshi12}</span>
                </div>
              </div>
            );
          })}

          {/* 中央 2x2 天盤中堂 */}
          <div
            style={{
              gridRowStart: 2,
              gridRowEnd: 4,
              gridColumnStart: 2,
              gridColumnEnd: 4,
            }}
            className="flex flex-col justify-center items-center p-4 sm:p-6 rounded-xl bg-gradient-to-b from-stone-900 to-slate-950 border-2 border-amber-600/50 shadow-inner text-center space-y-3"
          >
            <div className="space-y-1">
              <div className="text-amber-500 text-xs tracking-widest uppercase flex items-center justify-center gap-1.5 font-sans">
                <Compass className="w-3.5 h-3.5" />
                <span>文王後天 ‧ 紫微斗數全盤</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wider">
                {personName} 之本命盤
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs w-full max-w-xs font-sans">
              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-left">
                <span className="text-stone-400 block text-[10px]">四柱干支</span>
                <strong className="text-amber-300 font-bold text-xs">{chineseDate}</strong>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-left">
                <span className="text-stone-400 block text-[10px]">五行局數</span>
                <strong className="text-amber-300 font-bold text-xs">{fiveElementsClass}</strong>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-left">
                <span className="text-stone-400 block text-[10px]">本命命主星</span>
                <strong className="text-slate-200 text-xs">{soul}</strong>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-left">
                <span className="text-stone-400 block text-[10px]">後天身主星</span>
                <strong className="text-slate-200 text-xs">{body}</strong>
              </div>
            </div>

            <p className="text-[11px] text-stone-400 font-sans leading-relaxed">
              點選外圍任一宮位，即可在下方展開該宮位的詳細吉凶與星曜解讀。
            </p>
          </div>

        </div>
      </div>

      {/* 單宮詳情卡片 */}
      {selectedPalace && (
        <div className="bg-stone-900 text-stone-100 rounded-xl p-5 border border-amber-600/30 shadow-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-lg">
                【{selectedPalace.name}】
              </span>
              <span className="text-xs text-stone-400 font-mono px-2 py-0.5 rounded bg-stone-800">
                {selectedPalace.heavenlyStem}{selectedPalace.earthlyBranch}位
              </span>
              {selectedPalace.isOriginalPalace && (
                <span className="text-xs bg-red-600/30 text-red-300 border border-red-500/30 px-2 py-0.5 rounded">
                  本命命宮
                </span>
              )}
              {selectedPalace.isBodyPalace && (
                <span className="text-xs bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                  本命身宮
                </span>
              )}
            </div>
            <div className="text-xs text-amber-300 font-sans">
              大限年齡：{selectedPalace.decadal.range[0]} - {selectedPalace.decadal.range[1]} 歲
            </div>
          </div>

          {(() => {
            const d = describePalace(astrolabeData, selectedPalace);
            return (
              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 font-sans">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-amber-400 font-bold text-sm">這個宮位怎麼解</span>
                  <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${TONE_CLS[d.tone]}`}>{TONE_LABEL[d.tone]}</span>
                </div>
                <p className="text-sm leading-7 text-stone-200">{d.text}</p>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1.5">
              <div className="text-amber-400 font-bold">主要坐守星曜：</div>
              <div className="text-stone-200 leading-relaxed">
                {selectedPalace.majorStars.length > 0
                  ? selectedPalace.majorStars.map((s) => `${s.name} (${s.brightness || '平'}) ${s.mutagen ? `[化${s.mutagen}]` : ''}`).join('、')
                  : '無主星（借對宮星曜推算）'}
              </div>
            </div>

            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1.5">
              <div className="text-cyan-400 font-bold">輔吉星與煞星：</div>
              <div className="text-stone-200 leading-relaxed">
                {selectedPalace.minorStars.length > 0
                  ? selectedPalace.minorStars.map((s) => `${s.name} ${s.mutagen ? `[化${s.mutagen}]` : ''}`).join('、')
                  : '本宮無重要輔煞星'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
