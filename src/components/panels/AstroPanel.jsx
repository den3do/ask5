import React, { useMemo } from 'react';
import { Explainer, DarkStage } from '../ui';
import AstroChart from '../AstroChart';
import SmartReading from '../SmartReading';
import LifeStory from '../LifeStory';
import { buildAstroStory } from '../../utils/lifeReading';
import { ZODIAC_SIGNS, generateAstrologyAiPrompt } from '../../utils/astrology';

const CX = 270;
const CY = 270;
const R_OUT = 236;
const R_ZOD = 192;
const R_PLANET = 160;
const R_ASPECT = 100;
const NAMES = { sun: '太陽', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星', uranus: '天王星', neptune: '海王星', pluto: '冥王星' };
const ASP_LEGEND = [['合相', '#f59e0b'], ['六分相', '#3b82f6'], ['三分相', '#10b981'], ['四分相', '#ef4444'], ['對分相', '#8b5cf6']];

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
        if (gap < 12) {
          const push = (12 - gap) / 2;
          list[i - 1].disp -= push;
          list[i].disp += push;
        }
      }
    }
    return list;
  }, [chart]);

  const keyAspects = chart.aspects.filter((a) => a.angle !== 150);

  return (
    <svg viewBox="0 0 540 540" className="w-full max-w-[560px] mx-auto" role="img" aria-label="西洋本命星盤圓盤">
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
            <polygon points={arc(R_ZOD, R_OUT, a, a + 30)} fill={ELEMENT_FILL[z.element]} fillOpacity="0.75" stroke="#64748b" strokeWidth="1" />
            <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central" fontSize="24" fill="#f8fafc">{z.symbol}{TEXT}</text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={R_ZOD} fill="none" stroke="#64748b" strokeWidth="0.8" />

      {/* 宮位（整宮制）編號 */}
      {Array.from({ length: 12 }).map((_, i) => {
        const start = Math.floor(asc / 30) * 30 + i * 30;
        const [x1, y1] = pt(R_ASPECT + 6, start);
        const [x2, y2] = pt(R_ZOD, start);
        const [hx, hy] = pt(R_ASPECT + 13, start + 15);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="0.8" />
            <text x={hx} y={hy} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="#cbd5e1">{i + 1}</text>
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
        const [x, y] = pt(R_OUT + 18, lon);
        return <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="800" fill="#fbbf24">{label}</text>;
      })}

      {/* 相位線 */}
      {keyAspects.map((a, i) => {
        const [x1, y1] = pt(R_ASPECT, chart.positions[a.planet1].lon);
        const [x2, y2] = pt(R_ASPECT, chart.positions[a.planet2].lon);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.color} strokeOpacity={a.nature === 'major' ? 0.9 : 0.55} strokeWidth={a.nature === 'major' ? 1.8 : 1} />;
      })}

      {/* 行星 */}
      {planets.map((p) => {
        const [tx1, ty1] = pt(R_ZOD, p.lon);
        const [tx2, ty2] = pt(R_ZOD - 6, p.lon);
        const [gx, gy] = pt(R_PLANET, p.disp);
        const deg = Math.floor(chart.positions[p.id].sign.degree);
        const [dx, dy] = pt(R_PLANET - 31, p.disp);
        return (
          <g key={p.id}>
            <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke={PLANET_COLOR[p.id]} strokeWidth="2" />
            <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize="27" fontWeight="700" fill={PLANET_COLOR[p.id]}>{GLYPH[p.id]}{TEXT}</text>
            <text x={dx} y={dy} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill="#e2e8f0">{deg}°</text>
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

      {(chart.warnings || []).length > 0 && (
        <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1 font-sans">
          {chart.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
          <li>宮位制：{chart.houseSystem}。</li>
        </ul>
      )}

      <DarkStage>
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-3"><NatalWheel chart={chart} /></div>
            <div className="lg:col-span-2 bg-slate-900/70 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 font-sans space-y-3">
              <div className="font-bold text-amber-300">行星位置對照</div>
              <div className="grid grid-cols-1 gap-y-1.5">
                {Object.keys(GLYPH).map((id) => (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-2xl w-8 text-center" style={{ color: PLANET_COLOR[id] }}>{GLYPH[id]}{TEXT}</span>
                    <span className="w-16 font-bold">{NAMES[id]}</span>
                    <span className="text-slate-300">{chart.positions[id].sign.name} {Math.floor(chart.positions[id].sign.degree)}°・第 {chart.positions[id].house} 宮</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-slate-700 text-xs">
                {ASP_LEGEND.map(([n, c]) => (
                  <span key={n} className="flex items-center gap-1.5"><i className="inline-block w-6 h-1 rounded" style={{ background: c }} />{n}</span>
                ))}
              </div>
              <p className="text-xs text-slate-400 leading-6">外環＝十二星座（火紅、土褐、風藍、水深藍）；圈內數字＝宮位；AC＝上升、MC＝天頂；行星旁數字＝在星座內的度數。</p>
            </div>
          </div>
          <AstroChart chart={chart} personName={profile.name} />
        </div>
      </DarkStage>

      <LifeStory story={buildAstroStory(chart)} title="西洋占星・一生詳述" />

      <SmartReading systemKey="astro" prompt={generateAstrologyAiPrompt(chart, profile.name)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
