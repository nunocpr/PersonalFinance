// src/services/transactions/categoryDefaults.ts
const KEY = "pf_default_subcategory";

type MapType = Record<string, number>; // accountId -> subcategoryId

function read(): MapType {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(m: MapType) { localStorage.setItem(KEY, JSON.stringify(m)); }

export function getDefaultForAccount(accountId: number | null | undefined): number | null {
    if (!accountId && accountId !== 0) return null;
    const m = read();
    return m[String(accountId)] ?? null;
}

export function setDefaultForAccount(accountId: number, subCategoryId: number) {
    const m = read();
    m[String(accountId)] = subCategoryId;
    write(m);
}
