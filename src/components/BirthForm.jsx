import React, { useState } from 'react';
import { Save, Trash2, UserRound } from 'lucide-react';
import { CITY_LIST } from '../utils/astrology';
import { loadProfiles, saveProfile, deleteProfile } from '../utils/savedProfiles';
import { resolveBirth } from '../utils/profile';
import { trueSolarTime } from '../utils/ephemeris';

const inputCls = 'w-full border border-stone-300 rounded px-3 py-2 bg-stone-50 text-sm focus:border-indigo-600 focus:outline-none';

/**
 * 通用生辰表單（西曆、精確到分鐘、出生城市、可覆寫時區、可存取資料）
 */
export default function BirthForm({ title, value, onChange }) {
  const [saved, setSaved] = useState(() => loadProfiles());
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });

  const r = resolveBirth(value);
  let solar = null;
  if ([r.year, r.month, r.day].every(Number.isFinite)) {
    try {
      solar = trueSolarTime({ ...r, lon: r.city.lon });
    } catch { /* 略過 */ }
  }

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };

  const handleSave = () => {
    const res = saveProfile(value);
    if (res.ok) { setSaved(res.list); flash('已儲存'); } else flash(res.error);
  };
  const handleLoad = (e) => {
    const p = saved.find((x) => x.name === e.target.value);
    if (p) onChange({ ...value, ...p });
  };
  const handleDelete = () => {
    if (!value.name) return;
    setSaved(deleteProfile(value.name));
    flash('已刪除同名資料');
  };

  return (
    <div className="bg-white rounded-xl shadow border border-stone-200 p-5 space-y-4 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <h3 className="font-bold text-stone-800 text-base flex items-center gap-2">
          <UserRound className="w-5 h-5 text-indigo-600" />
          {title}
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <select value="" onChange={handleLoad} className="border border-stone-300 rounded px-2 py-1.5 bg-stone-50" aria-label="載入已儲存的生辰">
            <option value="">載入已存資料…</option>
            {saved.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <button type="button" onClick={handleSave} className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-stone-300 hover:bg-stone-100" title="以姓名為鍵儲存在本機瀏覽器">
            <Save className="w-3.5 h-3.5" />儲存
          </button>
          <button type="button" onClick={handleDelete} className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-stone-300 hover:bg-red-50 text-red-600" title="刪除同姓名的已存資料">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {msg && <span className="text-emerald-600">{msg}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs">
        <label className="space-y-1 col-span-2 sm:col-span-1">
          <span className="text-stone-600 block">姓名</span>
          <input type="text" value={value.name} onChange={set('name')} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">性別</span>
          <select value={value.gender} onChange={set('gender')} className={inputCls}>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">西元年</span>
          <input type="number" value={value.year} onChange={set('year')} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">月</span>
          <input type="number" min="1" max="12" value={value.month} onChange={set('month')} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">日</span>
          <input type="number" min="1" max="31" value={value.day} onChange={set('day')} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">時（0-23）</span>
          <input type="number" min="0" max="23" value={value.hour} onChange={set('hour')} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">分</span>
          <input type="number" min="0" max="59" value={value.minute} onChange={set('minute')} className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label className="space-y-1">
          <span className="text-stone-600 block">出生城市（決定經緯度與上升點）</span>
          <select value={value.cityIdx} onChange={set('cityIdx')} className={inputCls}>
            {CITY_LIST.map((c, i) => <option key={c.name} value={i}>{c.name}（UTC{c.tz >= 0 ? '+' : ''}{c.tz}）</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">時區覆寫（UTC 時差，留空則用城市預設；夏令時間請填實際值）</span>
          <input type="number" step="0.5" placeholder={`預設 ${r.city.tz}`} value={value.tzOverride} onChange={set('tzOverride')} className={inputCls} />
        </label>
      </div>

      {solar && (
        <p className="text-[11px] text-stone-500">
          真太陽時約 {String(solar.hour).padStart(2, '0')}:{String(solar.minute).padStart(2, '0')}
          （地方時差 {solar.lmtOffset >= 0 ? '+' : ''}{solar.lmtOffset.toFixed(0)} 分、均時差 {solar.eot >= 0 ? '+' : ''}{solar.eot.toFixed(0)} 分）。
          星盤與人類圖以標準時間換算 UTC 計算，不受影響；紫微與六爻採用鐘錶時間。
        </p>
      )}
    </div>
  );
}
