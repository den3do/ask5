import React from 'react';
import { HD_BODIES, HD_BODY_LABEL } from '../utils/humanDesign';

const CENTER_GRID_POSITIONS = [
  { key: 'head', label: '頭腦', row: 0, col: 1 },
  { key: 'ajna', label: '邏輯', row: 1, col: 1 },
  { key: 'throat', label: '喉嚨', row: 2, col: 1 },
  { key: 'gCenter', label: 'G中心', row: 3, col: 1 },
  { key: 'heart', label: '心臟', row: 3, col: 2 },
  { key: 'solar', label: '情緒', row: 4, col: 2 },
  { key: 'sacral', label: '薦骨', row: 4, col: 1 },
  { key: 'spleen', label: '脾臟', row: 4, col: 0 },
  { key: 'root', label: '根部', row: 5, col: 1 },
];

export default function HumanDesignChart({ hdData, personName = '命主' }) {
  if (!hdData) return null;

  const { typeInfo, profileInfo, definedChannels, centers, conscious, unconscious, authority, definition } = hdData;

  const definedChannelSet = new Set(definedChannels.map(ch => `${ch.gates[0]}-${ch.gates[1]}`));

  return (
    <div className="space-y-6 font-sans text-sm">
      {/* 頂部命格總覽 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 能量類型 */}
        <div className="rounded-xl border p-4 flex flex-col gap-1 shadow" style={{ background: `${typeInfo.color}15`, borderColor: `${typeInfo.color}40` }}>
          <div className="text-xs text-slate-400">能量類型（Type）</div>
          <div className="text-2xl font-black" style={{ color: typeInfo.color }}>
            {typeInfo.sign} {typeInfo.type}
          </div>
          <div className="text-xs text-slate-300 mt-1">人生策略：{typeInfo.strategy}</div>
          <div className="text-xs text-slate-400">內在權威：{authority}</div>
          <div className="text-xs text-slate-400">{definition} ｜ 天賦：{typeInfo.signature} ｜ 非自己：{typeInfo.notSelf}</div>
        </div>

        {/* 人生角色 */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex flex-col gap-1 shadow">
          <div className="text-xs text-slate-400">人生角色（Profile）</div>
          <div className="text-2xl font-black text-indigo-300">
            {profileInfo.profile} 號
          </div>
          <div className="text-xs text-indigo-200 mt-1">{profileInfo.description}</div>
        </div>

        {/* 關鍵閘門 */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col gap-1 shadow">
          <div className="text-xs text-slate-400">太陽閘門（意識/潛意識）</div>
          <div className="text-2xl font-black text-amber-300">
            Gate {conscious.sun.gate} · Gate {unconscious.sun.gate}
          </div>
          <div className="text-xs text-amber-200 mt-1">
            意識第 {conscious.sun.line} 爻 ｜ 潛意識第 {unconscious.sun.line} 爻
          </div>
        </div>
      </div>

      {/* 能量中心展示（2欄 Grid 卡片）*/}
      <div>
        <h4 className="text-amber-300 font-bold mb-3 flex items-center gap-2 text-sm">
          <span>⬡</span> 9 大能量中心啟動狀態
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CENTER_GRID_POSITIONS.map(({ key, label }) => {
            const center = centers[key];
            if (!center) return null;
            return (
              <div
                key={key}
                className={`rounded-xl border p-3 transition ${
                  center.isDefined
                    ? 'border-opacity-60 shadow-md'
                    : 'border-slate-700/50 bg-slate-900/40'
                }`}
                style={center.isDefined
                  ? { borderColor: center.color + '60', backgroundColor: center.color + '15' }
                  : {}}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-bold text-xs"
                    style={center.isDefined ? { color: center.color } : { color: '#6b7280' }}
                  >
                    {center.chName.endsWith("中心") ? center.chName : `${center.chName}中心`}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                    center.isDefined
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800/80 text-slate-500 border-slate-700'
                  }`}>
                    {center.isDefined ? '已定義 ✓' : '未定義 ○'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{center.desc}</p>
                {center.activeGates.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {center.activeGates.map(g => (
                      <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                        G{g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 點亮通道 */}
      {definedChannels.length > 0 ? (
        <div>
          <h4 className="text-amber-300 font-bold mb-3 flex items-center gap-2 text-sm">
            <span>⇄</span> 點亮通道（Defined Channels）
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {definedChannels.map((ch, i) => (
              <div key={i} className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-amber-300 font-bold text-xs">
                    G{ch.gates[0]} ⟷ G{ch.gates[1]}
                  </span>
                </div>
                <div className="font-semibold text-slate-200 text-xs">{ch.name}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-center text-slate-400 text-xs">
          <p>目前沒有點亮的完整通道（Single Gates 模式）</p>
          <p className="mt-1 text-slate-500">單閘門帶來的是個性化的特質，而非固定通道的能量。</p>
        </div>
      )}

      {/* 意識/潛意識行星閘門列表 */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <span className="text-amber-300 font-bold text-sm">🔢 完整行星閘門對照表</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-2 text-left">行星</th>
                <th className="px-4 py-2 text-center text-amber-300">⚫ 意識（黑身）</th>
                <th className="px-4 py-2 text-center text-red-300">🔴 潛意識（紅身）</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {HD_BODIES.map((p) => {
                const c = conscious[p];
                const u = unconscious[p];
                                return (
                  <tr key={p} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-2 font-semibold text-slate-200">{HD_BODY_LABEL[p]}</td>
                    <td className="px-4 py-2 text-center font-mono text-amber-200">
                      Gate {c?.gate}.{c?.line}
                    </td>
                    <td className="px-4 py-2 text-center font-mono text-red-300">
                      Gate {u?.gate}.{u?.line}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
