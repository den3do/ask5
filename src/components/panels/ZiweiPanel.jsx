import React from 'react';
import { Explainer, DarkStage } from '../ui';
import ZiweiPlate from '../ZiweiPlate';
import SmartReading from '../SmartReading';
import { generateZiweiAiPrompt } from '../../utils/ziwei';

export default function ZiweiPanel({ profile, onOpenSettings }) {
  const z = profile.ziwei;
  return (
    <div className="space-y-6">
      <Explainer title="什麼是「紫微斗數」？" accent="purple">
        <p>以出生的農曆年月日時安星，把人生分成<b>十二個宮位</b>（命宮、財帛、官祿、夫妻…），每個宮位坐落不同的主星與輔煞星。</p>
        <p>盤面為傳統「回字型」：外圍是十二宮，中央是你的基本資料（五行局、命主、身主）。<b>點選任一宮位</b>可看三方四正與星曜說明。星曜後的「祿、權、科、忌」是生年四化，代表該星當年的能量走向。</p>
        <p>你的命宮落在 <b>{z.corePalaces.soul?.earthlyBranch}</b> 宮，五行局為 <b>{z.fiveElementsClass}</b>。</p>
      </Explainer>

      <DarkStage className="!p-2 sm:!p-4">
        <ZiweiPlate astrolabeData={z} personName={profile.name} />
      </DarkStage>

      <SmartReading systemKey="ziwei" prompt={generateZiweiAiPrompt(z, profile.name)} onOpenSettings={onOpenSettings} />
    </div>
  );
}
