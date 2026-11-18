import React from 'react';
import { Explainer, SectionTitle } from '../ui';
import SmartReading from '../SmartReading';
import BaziCard from '../BaziCard';
import NajiaTable from '../NajiaTable';
import { generateIchingPrompt } from '../../utils/profile';

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
        <p>下方的「六爻全景納甲排盤」與一事一占同一套排法：由上而下為上爻到初爻，標出世應、空亡、動爻變化；卦中不現的六親會以「伏」標在它藏身的那一爻下方。</p>
      </Explainer>

      <NajiaTable
        lines={d.linesData}
        pillars={d.pillarsRaw}
        fuShen={d.fuShen}
        timeLabel="出生四柱"
        headerRight={(
          <>
            本命卦：<strong className="text-stone-800">{hex.name}</strong>・{d.hexagrams.palace}・互卦 {d.hexagrams.nuclear.hex.name}
            {d.moving && <>・{['初', '二', '三', '四', '五', '上'][d.moving - 1]}爻動 ➔ 變卦 {d.changedHex.name}</>}
          </>
        )}
      />

      <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs font-sans text-stone-700 leading-relaxed space-y-1">
        <div><b>白話：</b>{hex.vernacularText}</div>
        <div><b>世爻：</b>{d.hexagrams.shiPosition}</div>
        <div><b>應爻：</b>{d.hexagrams.yingPosition}</div>
      </div>

      <div className="space-y-4">
        <SectionTitle sub={`${shi?.wuxing || ''}行世爻・${shi?.relation || ''}持世`}>性格與氣場</SectionTitle>
        <InfoCard icon="🌿" title={d.personality.wuxingArchetype.title} tone="border-amber-200 bg-amber-50/60">
          <p>{d.personality.wuxingArchetype.desc}</p>
          <p>{d.personality.coreMindset}</p>
        </InfoCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard icon="🧭" title="人生指針（六親）"><p>{d.personality.relationDrive}</p></InfoCard>
          <InfoCard icon="🐲" title="外在氣場（六神）"><p>{d.personality.beastManner}</p></InfoCard>
          <InfoCard icon="⚠️" title="思維盲區" tone="border-rose-200 bg-rose-50/60"><p>{d.personality.blindSpots}</p></InfoCard>
        </div>

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

      <BaziCard bazi={profile.bazi} />

      <SmartReading systemKey="iching" prompt={generateIchingPrompt(profile)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
