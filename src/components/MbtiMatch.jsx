import React, { useState, useMemo } from 'react';
import { Copy, Download, FolderOpen, ArrowLeftRight } from 'lucide-react';
import { TYPES, DIMENSIONS } from '../data/mbti';
import { parseRecord } from '../utils/mbti';
import { buildMatchGuide, buildMatchText } from '../utils/mbtiMatch';
import { Explainer } from './ui';

const TYPE_LIST = Object.keys(TYPES);

function TypeSelect({ label, name, setName, type, setType, onFile, hint }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2 shadow-sm">
      <div className="text-xs font-bold text-stone-600">{label}</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={12}
        placeholder="稱呼(例如:我、小明)"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-stone-50"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-stone-50"
        aria-label={`${label}的類型`}
      >
        <option value="">選擇 MBTI 類型…</option>
        {TYPE_LIST.map((t) => <option key={t} value={t}>{t}・{TYPES[t].name}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer underline">
        <FolderOpen className="w-3.5 h-3.5" />載入 MBTI 存檔 (.json)
        <input type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
      </label>
      {hint && <p className="text-[11px] text-rose-600">{hint}</p>}
    </div>
  );
}

function download(filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const Card = ({ title, children, tone = 'border-stone-200 bg-white' }) => (
  <div className={`rounded-xl border p-4 shadow-sm ${tone}`}>
    <div className="font-bold text-sm text-stone-800 mb-2">{title}</div>
    <div className="text-xs text-stone-700 leading-relaxed space-y-1.5">{children}</div>
  </div>
);

export default function MbtiMatch({ myType = '', myName = '' }) {
  const [aName, setAName] = useState(myName || '我');
  const [bName, setBName] = useState('對方');
  const [aType, setAType] = useState(myType || '');
  const [bType, setBType] = useState('');
  const [aMsg, setAMsg] = useState('');
  const [bMsg, setBMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const loader = (setType, setName, setMsg) => async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const rec = parseRecord(await f.text());
    if (!rec) { setMsg('不是有效的 MBTI 存檔'); return; }
    setMsg('');
    setType(rec.type);
    if (rec.name && rec.name !== '未命名') setName(rec.name);
  };

  const guide = useMemo(
    () => (aType && bType ? buildMatchGuide({ type: aType, name: aName.trim() || '我' }, { type: bType, name: bName.trim() || '對方' }) : null),
    [aType, bType, aName, bName],
  );
  const text = useMemo(() => (guide ? buildMatchText(guide, { type: aType }, { type: bType }) : ''), [guide, aType, bType]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 剪貼簿不可用 */ }
  };

  return (
    <div className="space-y-4 font-sans">
      <Explainer title="這個功能怎麼用?" accent="emerald">
        <p>選擇你和另一個人的 MBTI(或載入測驗存檔),系統會逐一比對四個維度與認知功能,產生「怎麼互相搭配」的相處指南。</p>
        <p>適用於情侶、同事、朋友與家人。結果是依類型傾向推導的參考,沒有「配不配」,只有「怎麼配」。</p>
      </Explainer>

      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <TypeSelect label="你" name={aName} setName={setAName} type={aType} setType={setAType} onFile={loader(setAType, setAName, setAMsg)} hint={aMsg} />
        <button
          type="button"
          onClick={() => { setAType(bType); setBType(aType); setAName(bName); setBName(aName); }}
          className="mx-auto p-2 rounded-full border border-stone-300 bg-white text-stone-600"
          aria-label="對調"
          title="對調雙方"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <TypeSelect label="對方" name={bName} setName={setBName} type={bType} setType={setBType} onFile={loader(setBType, setBName, setBMsg)} hint={bMsg} />
      </div>

      {!guide && <p className="text-sm text-stone-500">請選好雙方類型,指南就會出現在下方。</p>}

      {guide && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-sky-50 p-5 text-center">
            <div className="text-2xl font-extrabold tracking-wider text-stone-800">
              {aType} <span className="text-stone-400 text-lg">×</span> {bType}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">{guide.an}({guide.A.name}) 與 {guide.bn}({guide.B.name})</div>
            <div className="mt-2 inline-block rounded-full bg-emerald-600 text-white text-xs font-bold px-3 py-1">
              {guide.meet.tag}・相同維度 {guide.meet.same}/4
            </div>
            <p className="text-sm text-stone-700 mt-2 leading-relaxed">{guide.meet.desc}</p>
          </div>

          <div className="space-y-3">
            {guide.dims.map((d) => (
              <Card
                key={d.key}
                title={`${DIMENSIONS[d.key].title}:${d.a}${d.same ? ' = ' : ' ≠ '}${d.b}${d.same ? '(相同)' : '(互補)'}`}
                tone={d.same ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'}
              >
                <p>{d.text}</p>
                <p><b className="text-rose-700">可能的摩擦:</b>{d.risk}</p>
                <p><b className="text-emerald-700">相處建議:</b>{d.tip}</p>
              </Card>
            ))}
          </div>

          <Card title="🧠 認知功能觀察">
            {guide.insights.map((i) => <p key={i.kind}><b>{i.kind}:</b>{i.text}</p>)}
          </Card>

          <div className="grid sm:grid-cols-2 gap-3">
            {[guide.forMe, guide.forThem].map((f) => (
              <Card key={f.title} title={`🤝 ${f.title}`}>
                <p><b>溝通風格:</b>{f.comm}</p>
                <p><b>最需要:</b>{f.needs}</p>
                <ul className="list-disc pl-4 space-y-0.5">{f.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </Card>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {guide.scenes.map((s) => (
              <Card key={s.scene} title={`📍 ${s.scene}`}>
                {s.items.map((t) => <p key={t}>{t}</p>)}
              </Card>
            ))}
          </div>

          <Card title="⚡ 壓力下的反應(互相理解)" tone="border-rose-200 bg-rose-50">
            {guide.stress.map((s) => <p key={s.who + s.type}><b>{s.who}({s.type}):</b>{s.text}</p>)}
          </Card>

          <Card title="✅ 行動清單" tone="border-emerald-200 bg-emerald-50">
            <ol className="list-decimal pl-4 space-y-1">{guide.actions.map((t) => <li key={t}>{t}</li>)}</ol>
          </Card>

          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm font-bold text-stone-700">
              <Copy className="w-4 h-4" />{copied ? '已複製' : '複製指南'}
            </button>
            <button
              onClick={() => download(`MBTI相處指南_${aType}x${bType}.txt`, text)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm font-bold text-stone-700"
            >
              <Download className="w-4 h-4" />下載指南 (.txt)
            </button>
          </div>
          <p className="text-[11px] text-stone-400">本指南依類型傾向產生,僅供娛樂與自我探索,每個人都是獨特的,請以實際相處為準。</p>
        </div>
      )}
    </div>
  );
}
