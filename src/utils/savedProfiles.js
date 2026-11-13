/** 生辰資料存檔：存成本機 JSON 檔（不使用瀏覽器儲存），檔內帶有本站標記 */
export const FILE_TAG = 'ask5-birth-profile';

/** 觸發瀏覽器下載 JSON 檔 */
export function downloadBirthProfile(birth) {
  const rec = { app: FILE_TAG, version: 1, savedAt: new Date().toISOString(), birth: { ...birth } };
  const name = (birth.name || '').trim() || '未命名';
  const blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `生辰_${name}_${rec.savedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 解析並驗證存檔。只接受帶有本站標記的檔案，且只還原目前表單已有的欄位。
 * 回傳 { ok:true, birth } 或 { ok:false, error }
 */
export function parseBirthProfile(text, template) {
  let rec;
  try { rec = JSON.parse(text); } catch { return { ok: false, error: '檔案不是有效的 JSON' }; }
  if (rec?.app !== FILE_TAG || typeof rec.birth !== 'object' || !rec.birth) {
    return { ok: false, error: '這不是本站產生的生辰存檔' };
  }
  const birth = {};
  for (const k of Object.keys(template)) {
    const v = rec.birth[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') continue;
    birth[k] = typeof template[k] === 'boolean' ? Boolean(v) : typeof template[k] === 'number' ? Number(v) : String(v);
  }
  if (!Object.keys(birth).length) return { ok: false, error: '存檔內沒有可用的生辰資料' };
  return { ok: true, birth };
}
