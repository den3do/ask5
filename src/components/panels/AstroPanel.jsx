import React, { useMemo } from 'react';
import { Explainer, DarkStage } from '../ui';
import AstroChart from '../AstroChart';
import SmartReading from '../SmartReading';
import { ZODIAC_SIGNS, generateAstrologyAiPrompt } from '../../utils/astrology';

const CX = 210;
const CY = 210;
const R_OUT = 198;
const R_ZOD = 166;
const R_PLANET = 140;
const R_ASPECT = 92;

const ELEMENT_FILL = { 火: '#7f1d1d', 土: '#78350f', 風: '#0c4a6e', 水: '#1e3a8a' };
const PLANET_COLOR = {
  sun: '#fbbf24', moon: '#93c5fd', mercury: '#5eead4', venus: '#f9a8d4', mars: '#f87171',
  jupiter: '#6ee7b7', saturn: '#cbd5e1', uranus: '#67e8f9', neptune: '#a5b4fc', pluto: '#c4b5fd',
};
const GLYPH = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇' };
const TEXT = '︎'; // 強制文字樣式，避免被換成 emoji

/** 本命星盤圓盤（上升點在左側，逆時針為黃道順行） */
function NatalWheel({ chart }) {
  const asc = chart.asc.lon;
  const pt = (r, lon) => {
    const th = ((180 + (lon - asc)) * Math.PI) / 180;
    return [CX + r * Math.cos(th), CY - r * Math.sin(th)];
  };
  const arc = (r1, r2, a, b) => {
    const pts = [];
    for (let l = a; l <= b + 0.01; l += 3) pts.push(pt(r2, l));
    for (let l = b; l >= a - 0.01; l -= 3) pts.push(pt(r1, l));
    return pts.map((p) => p.join(',')).join(' ');
  };

  const planets = useMemo(() => {
    const list = Object.keys(GLYPH).map((id) => ({ id, lon: chart.positions[id].lon }));
    list.sort((a, b) => a.lon - b.lon);
    list.forEach((p) => { p.disp = p.lon; });
    for (let pass = 0; pass < 40; pass++) {
      for (let i = 1; i < list.length; i++) {
        const gap = list[i].disp - list[i - 1].disp;
        if (gap < 9) {
          const push = (9 - gap) / 2;
          list[i - 1].disp -= push;
          list[i].disp += push;
        }
      }
    }
    return list;
  }, [chart]);

  const keyAspects = chart.aspects.filter((a) => a.angle !== 150);

  return (
    <svg viewBox="0 0 420 420" className="w-full max-w-[460px] mx-auto" role="img" aria-label="西洋本命星盤圓盤">
      <defs>
        <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={R_OUT + 8} fill="url(#wheelBg)" stroke="#334155" />

      {/* 十二星座環 */}
      {ZODIAC_SIGNS.map((z, i) => {
        const a = i * 30;
        const [sx, sy] = pt((R_OUT + R_ZOD) / 2, a + 15);
        return (
          <g key={z.name}>
            <polygon points={arc(R_ZOD, R_OUT, a, a + 30)} fill={ELEMENT_FILL[z.element]} fillOpacity="0.55" stroke="#475569" strokeWidth="0.6" />
            <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central" fontSize="15" fill="#f1f5f9">{z.symbol}{TEXT}</text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={R_ZOD} fill="none" stroke="#64748b" strokeWidth="0.8" />

      {/* 宮位（整宮制）編號 */}
      {Array.from({ length: 12 }).map((_, i) => {
        const start = Math.floor(asc / 30) * 30 + i * 30;
        const [x1, y1] = pt(R_ASPECT + 6, start);
        const [x2, y2] = pt(R_ZOD, start);
        const [hx, hy] = pt(R_ASPECT + 18, start + 15);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="0.5" />
            <text x={hx} y={hy} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#94a3b8">{i + 1}</text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={R_ASPECT + 6} fill="#0b1226" stroke="#475569" strokeWidth="0.6" />

      {/* 軸線 ASC-DSC、MC-IC */}
      {[asc, chart.mc.lon].map((lon, i) => {
        const [x1, y1] = pt(R_ZOD, lon);
        const [x2, y2] = pt(R_ZOD, lon + 180);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="4 3" />;
      })}
      {[['AC', asc], ['MC', chart.mc.lon]].map(([label, lon]) => {
        const [x, y] = pt(R_OUT + 14, lon);
        return <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill="#fbbf24">{label}</text>;
      })}

      {/* 相位線 */}
      {keyAspects.map((a, i) => {
        const [x1, y1] = pt(R_ASPECT, chart.positions[a.planet1].lon);
        const [x2, y2] = pt(R_ASPECT, chart.positions[a.planet2].lon);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.color} strokeOpacity={a.nature === 'major' ? 0.75 : 0.4} strokeWidth={a.nature === 'major' ? 1.2 : 0.7} />;
      })}

      {/* 行星 */}
      {planets.map((p) => {
        const [tx1, ty1] = pt(R_ZOD, p.lon);
        const [tx2, ty2] = pt(R_ZOD - 6, p.lon);
        const [gx, gy] = pt(R_PLANET, p.disp);
        const deg = Math.floor(chart.positions[p.id].sign.degree);
        const [dx, dy] = pt(R_PLANET - 19, p.disp);
        return (
          <g key={p.id}>
            <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke={PLANET_COLOR[p.id]} strokeWidth="1.4" />
            <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize="17" fill={PLANET_COLOR[p.id]}>{GLYPH[p.id]}{TEXT}</text>
            <text x={dx} y={dy} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#94a3b8">{deg}°</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AstroPanel({ profile, onOpenSettings }) {
  const chart = profile.astro;
  return (
    <div className="space-y-6">
      <Explainer title="什麼是「西洋占星本命盤」？" accent="sky">
        <p>以出生當下的天空為藍圖：<b>太陽</b>是核心自我、<b>月亮</b>是情感與安全感、<b>上升</b>（圖左側 AC）是你給世界的第一印象；其他行星各管思考、愛情、行動、成長與課題。</p>
        <p>外環是十二星座（顏色代表火、土、風、水四元素），行星字符旁的數字是它在該星座內的度數。中間的連線是<b>相位</b>：金色合相、綠色三分、藍色六分是和諧或強化；紅色四分、紫色對分是張力與挑戰。</p>
        <p>本站採<b>整宮制</b>宮位，行星位置使用 VSOP87 星曆計算，精度遠高於一般日常需求。</p>
      </Explainer>

      <DarkStage>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2"><NatalWheel chart={chart} /></div>
          <div className="lg:col-span-3"><AstroChart chart={chart} personName={profile.name} /></div>
        </div>
      </DarkStage>

      <SmartReading systemKey="astro" prompt={generateAstrologyAiPrompt(chart, profile.name)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
