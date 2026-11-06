export function localWorkspace<T>(key: string, value?: T): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('sentinel-workspace', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('files');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('files', value === undefined ? 'readonly' : 'readwrite');
      const request = value === undefined ? tx.objectStore('files').get(key) : tx.objectStore('files').put(value, key);
      tx.oncomplete = () => { db.close(); resolve(value === undefined ? request.result : value); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error('No se pudo guardar localmente.')); };
    };
  });
}

export function monitoringInfo(name: string) {
  const match = name.match(/^MdeA\s+(?:al\s+)?(\d{2})\.(\d{2})\.(\d{2})(10|20|30|40|50|60)(?:\s*\(\d+\))?\.xlsx?$/i);
  if (!match) return null;
  const [, day, month, year, period] = match;
  const date = new Date(2000 + Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== 2000 + Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return { date: `${day}/${month}/20${year}`, dateKey: `20${year}-${month}-${day}`, period, plan: Number(period) <= 30 ? 'tetramestral' as const : 'semestral' as const };
}

export function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
