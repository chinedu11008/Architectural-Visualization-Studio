const DATABASE_NAME = 'lumen-field-assets';
const STORE_NAME = 'assets';
const objectUrls = new Map();
export const MAX_BROWSER_IFC_BYTES = 16 * 1024 * 1024;

export function createLocalId() {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `local-${value}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalAsset(projectId, kind, file) {
  const id = createLocalId();
  const record = {
    id,
    projectId,
    kind,
    filename: file.name || `${kind}.bin`,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    blob: file,
  };
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  const url = URL.createObjectURL(file);
  objectUrls.set(id, url);
  return {
    id,
    localId: id,
    kind: kind === 'model' ? 'ifc' : kind,
    filename: record.filename,
    content_type: record.contentType,
    size_bytes: record.size,
    url,
    localOnly: true,
  };
}

export async function getLocalAssetBlob(id) {
  if (!id) return null;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

export async function resolveLocalAssetUrl(id) {
  if (objectUrls.has(id)) return objectUrls.get(id);
  const blob = await getLocalAssetBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, url);
  return url;
}