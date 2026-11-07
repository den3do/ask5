import React from 'react';
import { ThumbsUp, AlertTriangle, Compass, Route, Lightbulb } from 'lucide-react';

const TONE = {
  good: { chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  mid: { chip: 'bg-stone-100 text-stone-700 border-stone-300', bar: 'border-l-stone-400', dot: 'bg-stone-400' },
  bad: { chip: 'bg-rose-100 text-rose-800 border-rose-300', bar: 'border-l-rose-500', dot: 'bg-rose-500' },
};

function Block({ icon: Icon, title, children, tone = 'text-stone-800' }) {
  return (
    <section className="space-y-3">
      <h4 className={`flex items-center gap-2 text-base font-extrabold tracking-wide ${tone}`}>
        <Icon className="w-5 h-5" />{title}
      </h4>
      {children}
    </section>
  );
}

/** 「一生詳述」：總論、優缺點、各面向禍福、人生階段 */
export default function LifeStory({ story, title = '一生詳述' }) {
  if (!story) return null;
  const { labels } = story;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow p-5 sm:p-7 space-y-8 font-sans text-stone-800">
      <header className="border-b border-stone-200 pb-4">
        <div className="text-xs text-stone-500 tracking-wider">{title}</div>
        <h3 className="text-xl sm:text-2xl font-black mt-1">{story.headline}</h3>
      </header>

      <Block icon={Compass} title="命格總論">
        <div className="space-y-2 text-[15px] leading-8">
          {story.overview.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      </Block>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h4 className="flex items-center gap-2 font-extrabold text-emerald-900 mb-2"><ThumbsUp className="w-5 h-5" />優點與天賦</h4>
          <ul className="space-y-2 text-sm leading-7 list-disc pl-5 text-emerald-950">
            {story.strengths.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <h4 className="flex items-center gap-2 font-extrabold text-rose-900 mb-2"><AlertTriangle className="w-5 h-5" />缺點與盲點</h4>
          <ul className="space-y-2 text-sm leading-7 list-disc pl-5 text-rose-950">
            {story.weaknesses.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      </div>

      <Block icon={Compass} title="各面向的禍福與運勢">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {story.fortunes.map((f) => (
            <article key={f.label} className={`rounded-xl border border-stone-200 border-l-4 ${TONE[f.tone].bar} p-4 bg-stone-50`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h5 className="font-extrabold text-base">{f.icon} {f.label}{f.tag && <span className="ml-2 text-[11px] font-normal text-stone-500">{f.tag}</span>}</h5>
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${TONE[f.tone].chip}`}>{labels[f.tone]}</span>
              </div>
              <p className="text-sm leading-7 text-stone-700">{f.text}</p>
            </article>
          ))}
        </div>
      </Block>

      {story.keyPoints?.length > 0 && (
        <Block icon={Compass} title={story.keyTitle}>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {story.keyPoints.map((k, i) => (
              <li key={i} className={`rounded-lg border border-stone-200 border-l-4 ${TONE[k.tone || 'mid'].bar} px-3.5 py-2.5 bg-white`}>
                <div className="font-bold text-sm">{k.title}</div>
                <div className="text-xs leading-6 text-stone-600 mt-0.5">{k.text}</div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block icon={Route} title="一生運勢分期">
        <ol className="relative border-l-2 border-stone-200 ml-2 space-y-5">
          {story.stages.map((s, i) => (
            <li key={i} className="pl-5 relative">
              <span className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ring-4 ring-white ${TONE[s.tone].dot}`} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold">{s.range}</span>
                <span className="text-sm text-stone-600">{s.title}</span>
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${TONE[s.tone].chip}`}>{labels[s.tone]}</span>
              </div>
              <p className="text-sm leading-7 text-stone-700 mt-1">{s.text}</p>
            </li>
          ))}
        </ol>
      </Block>

      <Block icon={Lightbulb} title="給你的提醒">
        <ul className="list-disc pl-5 space-y-1.5 text-sm leading-7">
          {story.tips.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <p className="text-xs text-stone-500 leading-6 border-t border-stone-200 pt-3">
          以上為依傳統規則自動產生的參考解讀，用來幫助自我探索與規劃，不是對未來的保證；涉及健康、財務、法律等重大決定，請以專業意見與你自己的判斷為準。
        </p>
      </Block>
    </div>
  );
}
