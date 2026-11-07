import React from 'react';
import { Explainer, SectionTitle } from '../ui';
import SmartReading from '../SmartReading';
import { generateIchingPrompt } from '../../utils/profile';

const WX_STYLE = {
  木: 'bg-green-100 text-green-800 border-green-300',
  火: 'bg-red-100 text-red-800 border-red-300',
  土: 'bg-amber-100 text-amber-900 border-amber-300',
  金: 'bg-slate-100 text-slate-700 border-slate-300',
  水: 'bg-blue-100 text-blue-800 border-blue-300',
};

/** 卦象：六爻由上而下，陽爻實線、陰爻斷線，標示世應 */
function Hexagram({ lines }) {
  const top = [...lines].reverse();
  return (
    <div className="rounded-2xl bg-gradient-to-b from-amber-50 to-stone-100 border border-amber-200 p-4 shadow-inner">
      <div className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_1fr_auto] gap-x-3 gap-y-2 items-center font-sans text-xs">
        <div className="text-[10px] text-stone-400">爻位</div>
        <div className="text-[10px] text-stone-400 text-center">卦象</div>
        <div className="text-[10px] text-stone-400 text-right">納甲・六親・六神</div>
        {top.map((l) => (
          <React.Fragment key={l.lineNum}>
            <div className="text-stone-500 font-bold">
              {['初', '二', '三', '四', '五', '上'][l.lineNum - 1]}爻
              {l.isShi && <span className="ml-1 text-[10px] px-1 rounded bg-amber-600 text-white">世</span>}
              {l.isYing && <span className="ml-1 text-[10px] px-1 rounded bg-sky-600 text-white">應</span>}
            </div>
            <div className="flex items-center justify-center h-4" aria-label={l.bit ? '陽爻' : '陰爻'}>
              {l.bit ? (
                <div className={`h-3 w-full max-w-[11rem] rounded-sm ${l.isShi ? 'bg-amber-600' : 'bg-stone-800'}`} />
              ) : (
                <div className="flex w-full max-w-[11rem] justify-between">
                  <div className={`h-3 w-[44%] rounded-sm ${l.isShi ? 'bg-amber-600' : 'bg-stone-800'}`} />
                  <div className={`h-3 w-[44%] rounded-sm ${l.isShi ? 'bg-amber-600' : 'bg-stone-800'}`} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span className={`px-1.5 py-0.5 rounded border font-bold ${WX_STYLE[l.wuxing]}`}>{l.branch}{l.wuxing}</span>
              <span className="text-stone-600 w-8 text-right">{l.relation}</span>
              <span className="text-stone-400 w-8 text-right">{l.beast}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ icon, title, children, tone = 'border-stone-200 bg-white' }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm font-sans ${tone}`}>
      <div className="font-bold text-sm text-stone-800 mb-1.5 flex items-center gap-1.5"><span>{icon}</span>{title}</div>
      <div className="text-xs text-stone-700 leading-relaxed space-y-1.5">{children}</div>
    </div>
  );
}

export default function IchingPanel({ profile, onOpenSettings }) {
  const d = profile.destiny;
  const hex = d.hexagrams.original;
  const shi = d.linesData.find((l) => l.isShi);

  return (
    <div className="space-y-6">
      <Explainer title="什麼是「易經命卦」？" accent="amber">
        <p>以出生的年、月、日、時，依梅花易數起出一個專屬於你的「本命卦」，再用<b>六爻納甲</b>排出六個爻位的地支、五行、六親與六神。</p>
        <p><b>世爻</b>代表你自己、<b>應爻</b>代表外界與他人；世爻的五行與六親，決定你的性格底色與人生指針。<b>互卦</b>則像是事情發展的中段過程。</p>
        <p>圖中橘色實線標示世爻位置，由下而上為初爻到上爻。</p>
      </Explainer>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-stone-900 text-amber-100 p-5 text-center shadow-lg">
            <div className="text-xs text-amber-400/80 tracking-widest">本命卦</div>
            <div className="text-4xl font-black mt-1 tracking-wide">{hex.name}</div>
            <div className="text-xs text-stone-300 mt-1">{d.hexagrams.palace}　互卦：{d.hexagrams.nuclear.hex.name}</div>
            <div className="mt-3 text-[11px] text-stone-300 leading-relaxed border-t border-stone-700 pt-3">{hex.vernacularText}</div>
          </div>
          <Hexagram lines={d.linesData} />
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs font-sans text-stone-600 space-y-1">
            <div>四柱：<b className="text-stone-800">{d.meta.pillars}</b></div>
            <div>旬空：{d.meta.kongWang || '無'}</div>
            <div>世爻：{d.hexagrams.shiPosition}</div>
            <div>應爻：{d.hexagrams.yingPosition}</div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <SectionTitle sub={`${shi?.wuxing || ''}行世爻・${shi?.relation || ''}持世`}>性格與氣場</SectionTitle>
          <InfoCard icon="🌿" title={d.personality.wuxingArchetype.title} tone="border-amber-200 bg-amber-50/60">
            <p>{d.personality.wuxingArchetype.desc}</p>
            <p>{d.personality.coreMindset}</p>
          </InfoCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon="🧭" title="人生指針（六親）"><p>{d.personality.relationDrive}</p></InfoCard>
            <InfoCard icon="🐲" title="外在氣場（六神）"><p>{d.personality.beastManner}</p></InfoCard>
          </div>
          <InfoCard icon="⚠️" title="思維盲區" tone="border-rose-200 bg-rose-50/60"><p>{d.personality.blindSpots}</p></InfoCard>

          <SectionTitle>事業・財運・情感・身心</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon="💼" title="事業天職">
              <p>{d.career.roleOrientation}</p>
              <p className="text-stone-500">適合領域：{d.career.recommendedIndustries.join('、')}</p>
            </InfoCard>
            <InfoCard icon="💰" title="財運格局">
              <p>{d.wealth.wealthPattern}</p>
              <p className="text-stone-500">{d.wealth.caiYaoPresence}</p>
            </InfoCard>
            <InfoCard icon="💞" title="情感相處">
              <p>{d.relationship.shiYingDynamic}</p>
              <p className="text-stone-500">{d.relationship.romanceAdvice}</p>
            </InfoCard>
            <InfoCard icon="🫀" title="身心養護">
              <p>主要對應：{d.health.organSystem}</p>
              <p className="text-stone-500">{d.health.nurtureTips}</p>
            </InfoCard>
          </div>

          <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 font-sans text-xs text-stone-700 grid grid-cols-3 gap-3 text-center">
            <div><div className="text-[10px] text-stone-400">幸運色</div><div className="font-bold">{d.luckyKit.color}</div></div>
            <div><div className="text-[10px] text-stone-400">幸運數字</div><div className="font-bold">{d.luckyKit.numbers}</div></div>
            <div><div className="text-[10px] text-stone-400">貴人方位</div><div className="font-bold">{d.luckyKit.direction}</div></div>
            <div className="col-span-3 text-stone-600 italic border-t border-amber-200 pt-2">{d.luckyKit.motto}</div>
          </div>
        </div>
      </div>

      <SmartReading systemKey="iching" prompt={generateIchingPrompt(profile)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
