import React from 'react';
import { Explainer, DarkStage } from '../ui';
import HumanDesignChart from '../HumanDesignChart';
import SmartReading from '../SmartReading';
import { HD_CENTERS, HD_CHANNELS, generateHumanDesignAiPrompt } from '../../utils/humanDesign';

// 九中心在人體圖上的位置與形狀
const SHAPES = {
  head: { x: 160, y: 42, s: 'triUp', r: 26 },
  ajna: { x: 160, y: 108, s: 'triDown', r: 26 },
  throat: { x: 160, y: 182, s: 'square', r: 24 },
  gCenter: { x: 160, y: 268, s: 'diamond', r: 30 },
  heart: { x: 226, y: 282, s: 'triUp', r: 20 },
  spleen: { x: 62, y: 352, s: 'triRight', r: 28 },
  solar: { x: 258, y: 352, s: 'triLeft', r: 28 },
  sacral: { x: 160, y: 362, s: 'square', r: 28 },
  root: { x: 160, y: 458, s: 'square', r: 28 },
};

function shapePoints({ x, y, s, r }) {
  switch (s) {
    case 'triUp': return `${x},${y - r} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}`;
    case 'triDown': return `${x - r},${y - r * 0.8} ${x + r},${y - r * 0.8} ${x},${y + r}`;
    case 'triRight': return `${x - r * 0.8},${y - r} ${x + r},${y} ${x - r * 0.8},${y + r}`;
    case 'triLeft': return `${x + r * 0.8},${y - r} ${x - r},${y} ${x + r * 0.8},${y + r}`;
    case 'diamond': return `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`;
    default: return `${x - r},${y - r} ${x + r},${y - r} ${x + r},${y + r} ${x - r},${y + r}`;
  }
}

const COLOR = { c: '#e2e8f0', u: '#ef4444', b: '#fbbf24' };

function Bodygraph({ hd }) {
  const consciousSet = new Set(hd.consciousGates);
  const unconsciousSet = new Set(hd.unconsciousGates);
  const side = (g) => {
    const c = consciousSet.has(g);
    const u = unconsciousSet.has(g);
    return c && u ? 'b' : c ? 'c' : u ? 'u' : null;
  };
  const definedKey = new Set(hd.definedChannels.map((c) => c.gates.join('-')));

  // 依中心對分組，讓平行通道錯開
  const groups = {};
  for (const ch of HD_CHANNELS) {
    const key = [...ch.centers].sort().join('|');
    (groups[key] ||= []).push(ch);
  }

  const parts = [];
  const badges = [];
  for (const list of Object.values(groups)) {
    list.forEach((ch, idx) => {
      const [gA, gB] = ch.gates;
      const [cA, cB] = ch.centers;
      const A = SHAPES[cA];
      const B = SHAPES[cB];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const off = (idx - (list.length - 1) / 2) * 13;
      const ax = A.x + nx * off;
      const ay = A.y + ny * off;
      const bx = B.x + nx * off;
      const by = B.y + ny * off;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const defined = definedKey.has(ch.gates.join('-'));
      const sA = side(gA);
      const sB = side(gB);

      // 背景細線（所有通道）
      parts.push(<line key={`bg-${gA}-${gB}`} x1={ax} y1={ay} x2={bx} y2={by} stroke="#334155" strokeWidth="1" />);

      const half = (x1, y1, x2, y2, sd, k, frac = 1) => {
        if (!sd) return;
        parts.push(
          <line
            key={k}
            x1={x1} y1={y1}
            x2={x1 + (x2 - x1) * frac} y2={y1 + (y2 - y1) * frac}
            stroke={COLOR[sd]} strokeWidth={defined ? 5 : 3} strokeLinecap="round"
            opacity={defined ? 1 : 0.85}
          />
        );
      };
      half(ax, ay, mx, my, sA, `a-${gA}-${gB}`, defined ? 1 : 0.42);
      half(bx, by, mx, my, sB, `b-${gA}-${gB}`, defined ? 1 : 0.42);

      const badge = (g, x, y, sd) => {
        if (!sd) return;
        badges.push(
          <g key={`g-${g}-${gA}-${gB}`}>
            <circle cx={x} cy={y} r="8.5" fill="#0f172a" stroke={COLOR[sd]} strokeWidth="1.5" />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="#f8fafc">{g}</text>
          </g>
        );
      };
      const t = 0.3;
      badge(gA, ax + (bx - ax) * t, ay + (by - ay) * t, sA);
      badge(gB, bx + (ax - bx) * t, by + (ay - by) * t, sB);
    });
  }

  return (
    <svg viewBox="0 0 320 510" className="w-full max-w-[360px] mx-auto" role="img" aria-label="人類圖人體圖（Bodygraph）">
      {parts}
      {Object.entries(SHAPES).map(([key, sh]) => {
        const c = hd.centers[key];
        const def = c.isDefined;
        return (
          <g key={key}>
            <polygon
              points={shapePoints(sh)}
              fill={def ? HD_CENTERS[key].color : '#0f172a'}
              fillOpacity={def ? 0.92 : 1}
              stroke={def ? '#f8fafc' : '#64748b'}
              strokeWidth={def ? 1.6 : 1.2}
              strokeLinejoin="round"
            />
            <text x={sh.x} y={sh.y} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill={def ? '#0f172a' : '#94a3b8'}>
              {HD_CENTERS[key].chName}
            </text>
          </g>
        );
      })}
      {badges}
    </svg>
  );
}

export default function HdPanel({ profile, onOpenSettings }) {
  const hd = profile.hd;
  return (
    <div className="space-y-6">
      <Explainer title="什麼是「人類圖」？" accent="emerald">
        <p>人類圖把出生時刻（黑色＝意識）與出生前太陽約 88° 的時刻（紅色＝潛意識設計）兩組行星位置，對應到 64 個閘門，組成你的能量藍圖。</p>
        <p><b>如何看人體圖</b>：實心上色的是<b>已定義中心</b>（穩定、可輸出的能量），空心是<b>開放中心</b>（容易接收與放大外界）。兩端閘門都亮起的粗線是<b>完整通道</b>；只亮一端的細線是尚未連通的閘門。</p>
        <p>線與編號顏色：<span className="text-slate-500 font-bold">灰白＝意識</span>、<span className="text-red-600 font-bold">紅＝設計</span>、<span className="text-amber-600 font-bold">金＝兩者皆有</span>。</p>
        <p><b>類型與策略</b>是日常做決定的方法；<b>內在權威</b>是最可靠的判斷來源；<b>人生角色</b>（如 4/6）描述你與世界互動的方式。</p>
      </Explainer>

      <DarkStage>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2 space-y-3">
            <Bodygraph hd={hd} />
            <div className="flex flex-wrap justify-center gap-3 text-[11px] text-slate-400 font-sans">
              <span className="flex items-center gap-1"><i className="inline-block w-4 h-1.5 rounded bg-slate-200" />意識</span>
              <span className="flex items-center gap-1"><i className="inline-block w-4 h-1.5 rounded bg-red-500" />設計</span>
              <span className="flex items-center gap-1"><i className="inline-block w-4 h-1.5 rounded bg-amber-400" />兩者</span>
            </div>
          </div>
          <div className="lg:col-span-3"><HumanDesignChart hdData={hd} personName={profile.name} /></div>
        </div>
      </DarkStage>

      <SmartReading systemKey="hd" prompt={generateHumanDesignAiPrompt(hd, profile.name)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
