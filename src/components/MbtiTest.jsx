import React, { useState, useMemo } from 'react';
import { Download, Copy, RotateCcw, Users, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { DIMENSIONS, MODES, FN_NAMES } from '../data/mbti';
import { Explainer, SectionTitle } from './ui';
import { DETAIL, LETTER_NOTES } from '../data/mbtiDetail';
import MbtiMatch from './MbtiMatch';
import {
  getQuestions, interleave, scoreMbti, strengthLabel,
  buildRecord, parseRecord, buildReportText,
} from '../utils/mbti';

const LIKERT = [
  { v: 1, label: '非常不同意' },
  { v: 2, label: '不同意' },
  { v: 3, label: '中立' },
  { v: 4, label: '同意' },
  { v: 5, label: '非常同意' },
];

const GROUP_TONE = {
  分析家: 'from-purple-50 to-indigo-50 border-purple-300',
  外交家: 'from-emerald-50 to-teal-50 border-emerald-300',
  守護者: 'from-sky-50 to-blue-50 border-sky-300',
  探險家: 'from-amber-50 to-orange-50 border-amber-300',
};

function download(filename, text, mime = 'text/plain') {
  const blob = new Blob(['﻿' + text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DimBar({ k, d }) {
  const m = DIMENSIONS[k];
  return (
    <div className="font-sans">
      <div className="flex justify-between text-xs mb-1">
        <span className={d.letter === d.a ? 'font-bold text-amber-700' : 'text-stone-500'}>{m.aName}({d.a}) {d.aPct}%</span>
        <span className="text-stone-400">{m.title}・{strengthLabel(d.strength)}</span>
        <span className={d.letter === d.b ? 'font-bold text-amber-700' : 'text-stone-500'}>{d.bPct}% {m.bName}({d.b})</span>
      </div>
      <div className="relative h-3 rounded-full bg-stone-200 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-amber-500" style={{ width: `${d.aPct}%`, opacity: d.letter === d.a ? 1 : 0.4 }} />
        <div className="absolute inset-y-0 right-0 bg-stone-500" style={{ width: `${d.bPct}%`, opacity: d.letter === d.b ? 1 : 0.4 }} />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white" />
      </div>
    </div>
  );
}

function ResultView({ rec, onMatch }) {
  const res = useMemo(() => scoreMbti(rec.answers, rec.mode), [rec]);
  const info = res.info;
  const det = DETAIL[res.type];
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => buildReportText(rec), [rec]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪貼簿不可用時忽略,使用者仍可下載 */
    }
  };

  const Block = ({ title, children }) => (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm font-sans">
      <div className="font-bold text-sm text-stone-800 mb-1.5">{title}</div>
      <div className="text-xs text-stone-700 leading-relaxed">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border bg-gradient-to-br p-5 text-center ${GROUP_TONE[info.group]}`}>
        <div className="text-xs text-stone-500 font-sans">{rec.name}・{MODES[rec.mode].label}</div>
        <div className="text-5xl font-extrabold tracking-widest text-stone-800 my-1">{res.type}</div>
        <div className="font-bold text-stone-700">{info.name}<span className="text-stone-400 font-normal">({info.group})</span></div>
        <p className="text-sm text-stone-700 mt-2 font-sans leading-relaxed">{info.summary}</p>
      </div>

      <Block title="📖 你是什麼樣的人">{det.portrait}</Block>

      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
        {Object.entries(res.dims).map(([k, d]) => <DimBar key={k} k={k} d={d} />)}
        {rec.mode === 12 && (
          <p className="text-[11px] text-stone-500 font-sans">快速版每個維度僅 3 題,百分比只能作參考;想看更穩定的結果可再做 60 題完整版。</p>
        )}
        {Object.values(res.dims).some((d) => d.tie) && (
          <p className="text-[11px] text-stone-500 font-sans">有維度剛好持平(50%),字母暫依 I / N / F / P 取值,實際上兩側特質你都有。</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Block title="💪 優勢"><ul className="list-disc pl-4 space-y-0.5">{info.strengths.map((s) => <li key={s}>{s}</li>)}</ul></Block>
        <Block title="⚠️ 容易遇到的盲點"><ul className="list-disc pl-4 space-y-0.5">{info.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul></Block>
        <Block title="🗣️ 溝通風格">{det.comm}</Block>
        <Block title="🏢 工作中的你">{det.work}</Block>
        <Block title="⚡ 壓力下的你">{det.stress}</Block>
        <Block title="🎯 你最需要">{det.needs}</Block>
        <Block title="🤝 別人怎麼和你相處最舒服"><ul className="list-disc pl-4 space-y-0.5">{det.tips.map((s) => <li key={s}>{s}</li>)}</ul></Block>
        <Block title="💼 適合的方向">{info.careers.join('、')}</Block>
        <Block title="❤️ 感情與關係">{info.love}</Block>
        <Block title="🌱 成長建議">{info.growth}</Block>
        <Block title="🧠 認知功能堆疊">
          <ol className="space-y-0.5">
            {info.fn.map((f, i) => (
              <li key={f}><b>{['主導', '輔助', '第三', '劣勢'][i]}・{f}</b>:{FN_NAMES[f]}</li>
            ))}
          </ol>
        </Block>
      </div>

      <Explainer title="四個字母各代表什麼?" accent="purple" defaultOpen={false}>
        {res.type.split('').map((L) => (
          <p key={L}><b>{LETTER_NOTES[L].name}:</b>{LETTER_NOTES[L].text}</p>
        ))}
        <p>字母只表示「偏好」而非能力或好壞;百分比越接近 50%,代表兩邊你都常使用。</p>
      </Explainer>

      <div className="flex flex-wrap gap-2 font-sans">
        <button
          onClick={() => onMatch(res.type, rec.name)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold"
        >
          <Users className="w-4 h-4" />和另一個人配對相處
        </button>
        <button
          onClick={() => download(`MBTI_${res.type}_${rec.name}_${rec.date.slice(0, 10)}.json`, JSON.stringify(rec, null, 2), 'application/json')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-bold"
        >
          <Download className="w-4 h-4" />存檔到本機 (.json)
        </button>
        <button onClick={copy} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm font-bold text-stone-700">
          <Copy className="w-4 h-4" />{copied ? '已複製' : '複製報告'}
        </button>
        <button
          onClick={() => download(`MBTI_${res.type}_${rec.name}.txt`, text)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm font-bold text-stone-700"
        >
          <Download className="w-4 h-4" />下載文字報告 (.txt)
        </button>
      </div>
      <p className="text-[11px] text-stone-500 font-sans">資料只存在你下載的 .json 檔,網站不會保存;之後可用右上角「載入存檔」重新查看。</p>
      <p className="text-[11px] text-stone-400 font-sans">本測驗僅供娛樂與自我探索,非官方 MBTI® 測評,亦非心理診斷。</p>
    </div>
  );
}

export default function MbtiTest() {
  const [stage, setStage] = useState('intro'); // intro | quiz | result
  const [mode, setMode] = useState(12);
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [current, setCurrent] = useState(null); // 目前顯示的紀錄
  const [loadMsg, setLoadMsg] = useState('');
  const [view, setView] = useState('test'); // test | match

  const start = (m) => {
    setMode(m);
    setQuestions(interleave(getQuestions(m)));
    setAnswers({});
    setIdx(0);
    setStage('quiz');
  };

  const answer = (qid, v) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
    // 稍作停頓後自動下一題
    setTimeout(() => {
      setIdx((i) => (i < questions.length - 1 ? i + 1 : i));
    }, 180);
  };

  const finish = () => {
    setCurrent(buildRecord({ name, mode, answers }));
    setStage('result');
  };

  const loadFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const rec = parseRecord(await f.text());
    if (!rec) {
      setLoadMsg('這不是有效的 MBTI 存檔(.json),或檔案內容不完整。');
      return;
    }
    setLoadMsg('');
    setCurrent(rec);
    setStage('result');
  };

  const q = questions[idx];
  const answeredCount = Object.keys(answers).length;
  const allDone = questions.length > 0 && answeredCount === questions.length;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-stone-100 p-1 font-sans w-fit">
        {[['test', '人格測驗'], ['match', '配對相處指南']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`px-4 py-2 rounded-md text-sm font-bold ${view === id ? 'bg-white shadow text-amber-700' : 'text-stone-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'match' && <MbtiMatch myType={current?.type || ''} myName={current && current.name !== '未命名' ? current.name : ''} />}

      {view === 'test' && (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle sub="四個維度、十六種類型;可選快速或完整版,完成後可存成本機 JSON 檔">MBTI 十六型人格測驗</SectionTitle>
        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-700 cursor-pointer font-sans">
          <FolderOpen className="w-4 h-4" />載入存檔 (.json)
          <input type="file" accept=".json,application/json" onChange={loadFile} className="hidden" />
        </label>
      </div>
      )}
      {view === 'test' && loadMsg && <p className="text-xs text-rose-600 font-sans">{loadMsg}</p>}

      {view === 'test' && stage === 'intro' && (
        <div className="space-y-4 font-sans">
          <Explainer title="如何作答?" accent="sky">
            <p>每題請依「平常真實的你」選擇同意程度,沒有對錯,也無好壞之分。</p>
            <p>請避免選擇你「希望成為」的樣子,第一直覺通常最準。可上一題修改答案。</p>
          </Explainer>
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">姓名/暱稱(會寫進存檔與報告,可不填)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full sm:w-72 rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
              placeholder="例如:小明"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(MODES).map(([m, info]) => (
              <button
                key={m}
                onClick={() => start(Number(m))}
                className="text-left rounded-xl border-2 border-stone-200 hover:border-amber-500 bg-white p-4 shadow-sm transition"
              >
                <div className="font-extrabold text-stone-800">{info.label}</div>
                <div className="text-xs text-stone-500 mt-1">{info.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'test' && stage === 'quiz' && q && (
        <div className="space-y-4 font-sans">
          <div>
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>{MODES[mode].label}・第 {idx + 1} / {questions.length} 題</span>
              <span>已答 {answeredCount}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-base font-bold text-stone-800 leading-relaxed min-h-[3.5rem]">{q.t}</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
              {LIKERT.map((o) => (
                <button
                  key={o.v}
                  onClick={() => answer(q.id, o.v)}
                  aria-pressed={answers[q.id] === o.v}
                  className={`py-2.5 px-2 rounded-lg border text-sm font-bold transition ${
                    answers[q.id] === o.v
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-stone-50 border-stone-300 text-stone-700 hover:border-amber-500'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />上一題
            </button>
            <button
              onClick={() => { if (confirm('確定放棄目前作答?')) setStage('intro'); }}
              className="text-xs text-stone-400 underline"
            >
              放棄重來
            </button>
            {idx < questions.length - 1 ? (
              <button
                onClick={() => setIdx((i) => i + 1)}
                disabled={!answers[q.id]}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm disabled:opacity-40"
              >
                下一題<ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={!allDone}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold disabled:opacity-40"
              >
                看結果
              </button>
            )}
          </div>
          {!allDone && idx === questions.length - 1 && (
            <p className="text-xs text-stone-500 text-right">還有 {questions.length - answeredCount} 題未作答,請往前補答。</p>
          )}
        </div>
      )}

      {view === 'test' && stage === 'result' && current && (
        <div className="space-y-3">
          <ResultView rec={current} onMatch={() => setView('match')} />
          <button onClick={() => setStage('intro')} className="flex items-center gap-1.5 text-sm text-stone-600 underline font-sans">
            <RotateCcw className="w-4 h-4" />重新測驗
          </button>
        </div>
      )}

    </div>
  );
}
