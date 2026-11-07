/** 生辰資料存取（localStorage，僅存在使用者瀏覽器；全部包 try/catch） */
const KEY = 'ask5_birth_profiles_v1';

export function loadProfiles() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** 以姓名為鍵新增或覆蓋 */
export function saveProfile(birth) {
  const name = (birth.name || '').trim();
  if (!name) return { ok: false, error: '請先填寫姓名才能儲存' };
  const list = loadProfiles().filter((p) => p.name !== name);
  list.unshift({ ...birth, name });
  return write(list.slice(0, 30)) ? { ok: true, list: loadProfiles() } : { ok: false, error: '瀏覽器無法儲存（可能為無痕模式）' };
}

export function deleteProfile(name) {
  const list = loadProfiles().filter((p) => p.name !== name);
  write(list);
  return list;
}
