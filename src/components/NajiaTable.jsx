import React from 'react';

/** 單一爻線：陽爻實線、陰爻斷線 */
function Yao({ bit, cls }) {
  return (
    <div className="w-16 flex justify-between">
      {bit === 1 ? (
        <div className={`w-full h-2.5 rounded-sm ${cls}`} />
      ) : (
        <>
          <div className={`w-[45%] h-2.5 rounded-sm ${cls}`} />
          <div className={`w-[45%] h-2.5 rounded-sm ${cls}`} />
        </>
      )}
    </div>
  );
}

const Badge = ({ cls, children }) => (
  <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-black text-white ${cls}`}>{children}</span>
);

/**
 * 六爻全景納甲排盤（一事一占、易經命卦、唯心宗命卦共用）
 * @param {Array} lines buildNajiaBoard 的 linesData
 * @param {Object} pillars 起卦／出生四柱（year、month、day、hour、kongWang、yuePoBranch、riPoBranch）
 * @param {Array} fuShen buildNajiaBoard 的 fuShen（卦中不現之六親）
 * @param {string} yongShenRelation 用神六親（一事一占才有）；命卦不傳
 * @param {React.ReactNode} headerRight 標題列右側資訊
 * @param {string} timeLabel 四柱列標籤
 */
export default function NajiaTable({ lines, pillars, fuShen = [], yongShenRelation = null, headerRight = null, toolbar = null, timeLabel = '起卦時間' }) {
  const fuByLine = {};
  fuShen.forEach((f) => { fuByLine[f.lineNum] = f; });

  return (
    <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden font-sans">
      <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-stone-800 text-sm">六爻全景納甲排盤 (從上爻至初爻)</span>
        {headerRight && <span className="text-xs text-stone-500">{headerRight}</span>}
      </div>

      {toolbar && (
        <div className="px-6 py-2.5 border-b border-stone-200 flex flex-wrap items-center gap-x-5 gap-y-2">{toolbar}</div>
      )}

      {/* 四柱：供看卦者解卦 */}
      <div className="px-6 py-3 border-b border-stone-200 bg-amber-50/50 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="text-xs text-stone-500">{timeLabel}</span>
        {[['年', pillars.year], ['月', pillars.month], ['日', pillars.day], ['時', pillars.hour]].filter(([, v]) => v).map(([k, v]) => (
          <span key={k} className="text-stone-600">
            <strong className="text-stone-900 text-base tracking-wider">{v}</strong>
            <span className="text-xs ml-0.5">{k}</span>
          </span>
        ))}
        <span className="text-xs text-stone-600">旬空：<strong className="text-amber-700">{(pillars.kongWang || []).join('、') || '無'}</strong></span>
        <span className="text-xs text-stone-600">月破：<strong className="text-rose-600">{pillars.yuePoBranch}</strong></span>
        <span className="text-xs text-stone-600">日破：<strong className="text-purple-600">{pillars.riPoBranch}</strong></span>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-stone-200 text-xs text-stone-500">
              <th className="py-2 px-3" title="每一爻附帶的性格標籤">六神</th>
              <th className="py-2 px-3" title="這一爻代表的角色：財、官、父母、子孫、兄弟；世＝你、應＝對方；伏＝卦中不現、藏在這一爻之下的六親">六親標註</th>
              <th className="py-2 px-3" title="第幾爻，陽＝實線、陰＝斷線">本卦爻象</th>
              <th className="py-2 px-3" title="這一爻對應的地支與五行">干支五行</th>
              <th className="py-2 px-3 text-center" title="左邊是現況，右邊是變化後">卦爻符號 (本 ➔ 變)</th>
              <th className="py-2 px-3" title="只有動爻會變化；安靜＝不變">動變與回頭作用</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {[...lines].reverse().map((line) => {
              const fu = fuByLine[line.lineNum];
              const isYongShen = !!yongShenRelation && line.relation === yongShenRelation;
              const fuIsYongShen = !!fu && !!yongShenRelation && fu.relation === yongShenRelation;
              return (
                <tr
                  key={line.lineNum}
                  className={`hover:bg-stone-50 transition-colors ${line.isMoving ? 'bg-amber-50/60' : ''} ${isYongShen || fuIsYongShen ? 'bg-indigo-50/50' : ''}`}
                >
                  <td className="py-2.5 px-3 font-medium text-xs text-stone-600">{line.beast}</td>

                  <td className="py-2.5 px-3">
                    <span className="font-bold text-stone-800">{line.relation}</span>
                    {line.isShi && <Badge cls="bg-rose-600 shadow-sm">世</Badge>}
                    {line.isYing && <Badge cls="bg-blue-600 shadow-sm">應</Badge>}
                    {line.isKongWang && <Badge cls="bg-amber-600">空</Badge>}
                    {line.isYuePo && <Badge cls="bg-purple-600">月破</Badge>}
                    {isYongShen && <Badge cls="bg-indigo-600">用神</Badge>}
                    {fu && (
                      <div
                        className={`mt-1.5 flex items-center gap-1 text-xs ${fuIsYongShen ? 'text-indigo-700' : 'text-stone-500'}`}
                        title="卦中不現的六親，取本宮八純卦同位之爻為伏神，藏在這一爻（飛神）之下"
                      >
                        <span className={`px-1 py-0.5 rounded border border-dashed text-[10px] font-black ${fuIsYongShen ? 'border-indigo-400' : 'border-stone-400'}`}>伏</span>
                        <span className="font-bold">{fu.relation}</span>
                        <span className="font-mono font-bold">{fu.branch}{fu.wuxing}</span>
                        {fu.isKongWang && <span className="px-1 py-0.5 rounded text-[10px] font-black bg-amber-600 text-white">空</span>}
                        {fu.isYuePo && <span className="px-1 py-0.5 rounded text-[10px] font-black bg-purple-600 text-white">月破</span>}
                        {fuIsYongShen && <span className="px-1 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">用神</span>}
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-xs text-stone-600">第 {line.lineNum} 爻 ({line.bit === 1 ? '陽' : '陰'})</td>

                  <td className="py-2.5 px-3 font-mono font-bold text-stone-700">{line.branch}{line.wuxing}</td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-3">
                      <Yao bit={line.bit} cls="bg-stone-800" />
                      <span className="text-stone-300 text-xs">➔</span>
                      <div className="opacity-70">
                        {line.isMoving
                          ? <Yao bit={line.bit === 1 ? 0 : 1} cls="bg-amber-600" />
                          : <Yao bit={line.bit} cls="bg-stone-300" />}
                      </div>
                    </div>
                  </td>

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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
