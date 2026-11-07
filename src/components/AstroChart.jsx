import React, { useState } from 'react';
import { Sun, Star, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ZODIAC_SIGNS, PLANETS } from '../utils/astrology';

const PLANET_INFO = {
  sun: { label: '太陽', emoji: '☀️', desc: '本我意識、使命', textColor: 'text-amber-300' },
  moon: { label: '月亮', emoji: '🌙', desc: '情感、潛意識', textColor: 'text-blue-300' },
  mercury: { label: '水星', emoji: '🗣️', desc: '溝通、思維', textColor: 'text-teal-300' },
  venus: { label: '金星', emoji: '💫', desc: '愛情、美感', textColor: 'text-pink-300' },
  mars: { label: '火星', emoji: '🔥', desc: '行動力、慾望', textColor: 'text-red-400' },
  jupiter: { label: '木星', emoji: '🏆', desc: '幸運、擴展', textColor: 'text-emerald-300' },
  saturn: { label: '土星', emoji: '⚖️', desc: '業力、挑戰', textColor: 'text-slate-300' },
  uranus: { label: '天王星', emoji: '⚡', desc: '突破、革命', textColor: 'text-cyan-300' },
  neptune: { label: '海王星', emoji: '🌊', desc: '靈性、幻象', textColor: 'text-indigo-300' },
  pluto: { label: '冥王星', emoji: '💎', desc: '轉化、深層力量', textColor: 'text-purple-300' },
  asc: { label: '上升點', emoji: '↑', desc: '外在人格、外表', textColor: 'text-orange-300' },
  mc: { label: '天頂', emoji: '⬆', desc: '事業、社會形象', textColor: 'text-yellow-300' },
};

const ELEMENT_COLORS = {
  '火': 'bg-red-500/20 text-red-300 border-red-500/30',
  '土': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  '風': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  '水': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const ASPECT_COLORS = {
  '合相': 'text-amber-400',
  '三分相': 'text-emerald-400',
  '六分相': 'text-blue-400',
  '四分相': 'text-red-400',
  '對分相': 'text-purple-400',
  '十二分之五相': 'text-slate-400',
};

export default function AstroChart({ chart, personName = '命主' }) {
  const [showAllPlanets, setShowAllPlanets] = useState(false);
  if (!chart) return null;

  const { positions, aspects, sun, moon, asc } = chart;
  const displayPlanets = showAllPlanets
    ? ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'asc', 'mc']
    : ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'asc'];

  return (
    <div className="space-y-6 font-sans text-sm">
      {/* 三核心快覽 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'sun', label: '☀️ 太陽星座', desc: '本我意識', data: sun },
          { key: 'moon', label: '🌙 月亮星座', desc: '情感潛意識', data: moon },
          { key: 'asc', label: '↑ 上升星座', desc: '外在人格', data: asc },
        ].map(({ key, label, desc, data }) => {
          if (!data) return null;
          const elemClass = ELEMENT_COLORS[data.sign.element] || 'bg-slate-800 text-slate-300 border-slate-700';
          return (
            <div key={key} className={`rounded-xl border p-4 ${elemClass} flex flex-col gap-1 shadow`}>
              <div className="text-xs opacity-70">{label} · {desc}</div>
              <div className="text-xl font-black tracking-wide">
                {data.sign.symbol} {data.sign.name}
              </div>
              <div className="text-xs opacity-80 font-mono">
                {data.sign.degreeStr}
              </div>
              <div className="text-[11px] opacity-60">
                {data.sign.element}象 · {data.sign.mode}宮 · 守護星：{data.sign.ruling}
              </div>
            </div>
          );
        })}
      </div>

      {/* 所有行星星座位置列表 */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-amber-300 font-bold text-sm">🪐 完整行星星座位置表</span>
          <button
            type="button"
            onClick={() => setShowAllPlanets(!showAllPlanets)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
          >
            {showAllPlanets ? <><ChevronUp className="w-3 h-3" />收起外行星</> : <><ChevronDown className="w-3 h-3" />展開全部</>}
          </button>
        </div>
        <div className="divide-y divide-slate-800">
          {displayPlanets.map((pid) => {
            const pos = positions[pid];
            const info = PLANET_INFO[pid];
            if (!pos || !info) return null;
            const elemClass = ELEMENT_COLORS[pos.sign.element] || '';
            return (
              <div key={pid} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/50 transition">
                <span className="text-lg w-7 text-center">{info.emoji}</span>
                <span className={`w-16 font-bold text-xs ${info.textColor}`}>{info.label}</span>
                <span className={`flex-1 text-xs px-2 py-0.5 rounded border ${elemClass}`}>
                  {pos.sign.name}
                </span>
                <span className="font-mono text-[11px] text-slate-400 w-28 text-right">{pos.sign.degreeStr}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 主要相位列表 */}
      {aspects.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <span className="text-amber-300 font-bold text-sm">🔺 主要行星相位（Major Aspects）</span>
          </div>
          <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
            {aspects.map((asp, i) => {
              const p1 = PLANET_INFO[asp.planet1];
              const p2 = PLANET_INFO[asp.planet2];
              const aspColor = ASPECT_COLORS[asp.name] || 'text-slate-400';
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-slate-800/50 transition">
                  <span className="w-6 text-center">{p1?.emoji || asp.planet1}</span>
                  <span className="text-slate-200 font-semibold">{p1?.label}</span>
                  <span className={`font-black text-base w-6 text-center ${aspColor}`}>{asp.symbol}</span>
                  <span className={`font-bold ${aspColor}`}>{asp.name}</span>
                  <span className="w-6 text-center">{p2?.emoji || asp.planet2}</span>
                  <span className="text-slate-200 font-semibold flex-1">{p2?.label}</span>
                  <span className="font-mono text-slate-500">容許度 {asp.orb.toFixed(1)}°</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
