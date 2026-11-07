import React from 'react';
import { Explainer, DarkStage } from '../ui';
import ZiweiPlate from '../ZiweiPlate';
import SmartReading from '../SmartReading';
import LifeStory from '../LifeStory';
import { buildZiweiStory } from '../../utils/lifeReading';
import { generateZiweiAiPrompt } from '../../utils/ziwei';

export default function ZiweiPanel({ profile, onOpenSettings }) {
  const z = profile.ziwei;
  if (!z) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 leading-7">
        <b>需要出生時辰才能排紫微命盤。</b>
        <p>時辰決定命宮與全盤的星曜位置；未知時辰無論怎麼排都是猜測，所以本站選擇不排，而不是假造一張盤給你。請向家人或翻戶口名簿、出生證明確認出生時間，再回到表單取消「不知道出生時間」。</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <Explainer title="什麼是「紫微斗數」？" accent="purple">
        <p>以出生的農曆年月日時安星，把人生分成<b>十二個宮位</b>（命宮、財帛、官祿、夫妻…），每個宮位坐落不同的主星與輔煞星。</p>
        <p>盤面為傳統「回字型」：外圍是十二宮，中央是你的基本資料（五行局、命主、身主）。<b>點選任一宮位</b>可看三方四正與星曜說明。星曜後的「祿、權、科、忌」是生年四化，代表該星當年的能量走向。</p>
        <p>你的命宮落在 <b>{z.corePalaces.soul?.earthlyBranch}</b> 宮，五行局為 <b>{z.fiveElementsClass}</b>。</p>
      </Explainer>

      {z.yearNote && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">⚠ {z.yearNote}</p>}

      <DarkStage className="!p-2 sm:!p-4">
        <ZiweiPlate astrolabeData={z} personName={profile.name} />
      </DarkStage>

      <LifeStory story={buildZiweiStory(z)} title="紫微斗數・一生詳述" />

      <SmartReading systemKey="ziwei" prompt={generateZiweiAiPrompt(z, profile.name)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
