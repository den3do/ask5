import React, { useState } from 'react';
import { Save, Trash2, UserRound } from 'lucide-react';
import { CITY_LIST } from '../utils/astrology';
import { loadProfiles, saveProfile, deleteProfile } from '../utils/savedProfiles';
import { resolveBirth } from '../utils/profile';

const inputCls = 'w-full border border-stone-300 rounded px-3 py-2 bg-stone-50 text-sm focus:border-indigo-600 focus:outline-none';

/**
 * 通用生辰表單（西曆、精確到分鐘、出生城市、可覆寫時區、可存取資料）
 */
export default function BirthForm({ title, value, onChange }) {
  const [saved, setSaved] = useState(() => loadProfiles());
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });

  const r = resolveBirth(value);
  const m = r.moment;
  const solar = m?.trueSolar || null;

  const pad = (v, n = 2) => String(parseInt(v, 10)).padStart(n, '0');
  const okNum = (v) => Number.isFinite(parseInt(v, 10));
  const dateValue = okNum(value.year) && okNum(value.month) && okNum(value.day)
    ? `${pad(value.year, 4)}-${pad(value.month)}-${pad(value.day)}` : '';
  const timeValue = okNum(value.hour) ? `${pad(value.hour)}:${pad(value.minute || 0)}` : '';
  const handleDate = (e) => {
    const [y, mo, d] = e.target.value.split('-');
    if (y && mo && d) onChange({ ...value, year: String(parseInt(y, 10)), month: String(parseInt(mo, 10)), day: String(parseInt(d, 10)) });
  };
  const handleTime = (e) => {
    const [h, mi] = e.target.value.split(':');
    if (h !== undefined && mi !== undefined && h !== '') onChange({ ...value, hour: String(parseInt(h, 10)), minute: String(parseInt(mi, 10)) });
  };

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <label className="space-y-1 col-span-2 md:col-span-1">
          <span className="text-stone-600 block">姓名（可留空）</span>
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
          <span className="text-stone-600 block">出生日期（西元）</span>
          <input type="date" min="1900-01-01" max="2100-12-31" value={dateValue} onChange={handleDate} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-stone-600 block">出生時間（24 小時制）</span>
          <input type="time" value={r.timeKnown ? timeValue : ''} onChange={handleTime} disabled={!r.timeKnown} className={`${inputCls} ${r.timeKnown ? '' : 'opacity-50'}`} />
          <label className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-600">
            <input type="checkbox" checked={!r.timeKnown} onChange={(e) => onChange({ ...value, timeKnown: !e.target.checked })} />
            不知道出生時間
          </label>
        </label>
      </div>
      {!r.timeKnown && <p className="text-[11px] text-amber-700 -mt-2">未提供出生時間：不排時柱與紫微，占星改採太陽盤（無上升與宮位），人類圖與六爻會標示不確定處；八字與其他資料仍可參考。</p>}
      <p className="text-[11px] text-stone-500 -mt-2">不確定幾點出生？請向家人或翻戶口名簿、出生證明確認；時間差一個時辰，紫微、八字與星盤上升點都可能不同。</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-2">
          <label className="space-y-1 block">
            <span className="text-stone-600 block">出生地點（決定經緯度與上升點）</span>
            <select value={value.cityIdx} onChange={set('cityIdx')} className={inputCls}>
              {CITY_LIST.map((c, i) => <option key={c.name} value={i}>{c.name}（UTC{c.tz >= 0 ? '+' : ''}{c.tz}）</option>)}
              <option value="custom">找不到？手動輸入經緯度…</option>
            </select>
          </label>
          {value.cityIdx === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.0001" placeholder="緯度（北＋南－）" value={value.customLat ?? ''} onChange={set('customLat')} className={inputCls} />
              <input type="number" step="0.0001" placeholder="經度（東＋西－）" value={value.customLon ?? ''} onChange={set('customLon')} className={inputCls} />
              <p className="col-span-2 text-[11px] text-stone-500">可在地圖 App 長按出生地取得經緯度。自訂地點無法自動判斷歷史時區，預設以經度估算，請於右側填入當時實際的 UTC 時差。</p>
            </div>
          )}
        </div>
        <label className="space-y-1">
          <span className="text-stone-600 block">時區覆寫（UTC 時差；留空＝自動依出生年份的歷史時區與夏令時間）</span>
          <input type="number" step="0.5" placeholder={m ? `自動：UTC${m.tzHours >= 0 ? '+' : ''}${Number(m.tzHours.toFixed(2))}` : `預設 ${r.city.tz}`} value={value.tzOverride} onChange={set('tzOverride')} className={inputCls} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={r.useTrueSolar}
            disabled={!r.timeKnown}
            onChange={(e) => onChange({ ...value, useTrueSolar: e.target.checked })}
          />
          時辰改採真太陽時（預設為鐘錶時間；只影響時辰，不改日柱與農曆日）
        </label>
        <label className="flex items-center gap-2">
          夜子時（23:00–00:59）
          <select value={r.zishi} onChange={set('zishi')} className="border border-stone-300 rounded px-2 py-1 bg-stone-50">
            <option value="next">晚子時算次日（日柱換日）</option>
            <option value="same">早晚子時（日柱不換）</option>
          </select>
        </label>
      </div>

      {solar && r.timeKnown && (
        <div className="text-[11px] text-stone-500 space-y-0.5">
          <p>
            真太陽時約 {String(solar.hour).padStart(2, '0')}:{String(solar.minute).padStart(2, '0')}
            （相對標準時區經線 {solar.lmtOffset >= 0 ? '+' : ''}{solar.lmtOffset.toFixed(0)} 分、均時差 {solar.eot >= 0 ? '+' : ''}{solar.eot.toFixed(0)} 分）。
            星盤與人類圖直接用絕對時刻（UTC）計算，與此設定無關。
          </p>
          {m?.tzNote && <p className="text-amber-600">⚠ {m.tzNote}</p>}
          {m?.chinese?.lateZi && <p className="text-amber-600">⚠ 23:00 後為夜子時，本站依「夜子時換日」以次日子時排盤。</p>}
        </div>
      )}
    </div>
  );
}
