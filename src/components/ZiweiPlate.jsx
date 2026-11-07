import React, { useState } from 'react';
import { Sparkles, Compass, Shield, User, Info, ArrowUpRight } from 'lucide-react';
import { ZIWEI_GRID_LAYOUT } from '../utils/ziwei';

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
      {/* 4x4 經典回字型命盤 */}
      <div className="bg-slate-950 p-3 sm:p-5 rounded-2xl border-2 border-amber-600/40 shadow-2xl overflow-x-auto">
        <div className="min-w-[720px] max-w-[960px] mx-auto grid grid-cols-4 grid-rows-4 gap-1.5 sm:gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          
          {/* 渲染 12 個外圍宮位 */}
          {ZIWEI_GRID_LAYOUT.map(({ branch, row, col }) => {
            const palace = palacesByBranch[branch];
            if (!palace) return null;

            const isSelected = selectedBranch === branch;
            const isSoul = palace.isOriginalPalace || palace.name === '命宮';
            const isBody = palace.isBodyPalace;

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
                className={`relative flex flex-col justify-between p-2 sm:p-2.5 rounded-xl border cursor-pointer transition-all min-h-[140px] sm:min-h-[160px] text-xs select-none ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500'
                    : isSoul
                    ? 'bg-red-950/20 border-red-500/40 hover:bg-slate-800/80 hover:border-slate-600'
                    : 'bg-slate-900/90 border-slate-800/90 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                {/* 宮位頂部標籤 */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold text-xs sm:text-sm ${
                      isSoul ? 'text-red-400' : isSelected ? 'text-amber-300' : 'text-slate-200'
                    }`}>
                      {palace.name}
                    </span>
                    {isBody && (
                      <span className="bg-indigo-600/60 text-indigo-200 border border-indigo-400/40 text-[9px] px-1 rounded">
                        身
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-stone-400">
                    {palace.heavenlyStem}{palace.earthlyBranch}
                  </span>
                </div>

                {/* 主星群 (14主星) */}
                <div className="my-1.5 space-y-0.5">
                  {palace.majorStars.length > 0 ? (
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      {palace.majorStars.map((star, idx) => (
                        <div key={idx} className="flex items-center text-xs">
                          <span className={`font-extrabold ${
                            star.isMajor ? 'text-amber-300' : 'text-slate-200'
                          }`}>
                            {star.name}
                          </span>
                          {star.brightness && (
                            <span className={`text-[10px] ml-0.5 ${getBrightnessClass(star.brightness)}`}>
                              [{star.brightness}]
                            </span>
                          )}
                          {getMutagenBadge(star.mutagen)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-stone-600 text-[11px] italic">（借對宮主星）</span>
                  )}
                </div>

                {/* 輔星、吉曜與煞曜 */}
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] leading-tight text-slate-400">
                  {palace.minorStars.map((star, idx) => (
                    <span key={idx} className={`${
                      ['擎羊', '陀羅', '火星', '鈴星', '天空', '地劫'].includes(star.name)
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
                    <span key={idx} className="text-stone-500 text-[9px]">
                      {star.name}
                    </span>
                  ))}
                </div>

                {/* 底部：大限區間與長生博士 */}
                <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-stone-500 font-sans">
                  <span>{palace.changsheng12}</span>
                  <span className="font-mono text-amber-500/80 font-bold">
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
