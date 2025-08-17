import Papa from "papaparse";

export type RawCsvRow = { date: string; description: string; cents: number };

// --- helpers ---
const norm = (s: string) =>
    String(s || "")
        .replace(/^\uFEFF/, "")        // BOM
        .replace(/\u00A0/g, " ")       // NBSP -> space
        .replace(/\uFFFD/g, "")        // replacement chars (bad decode)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // strip diacritics

const ddmmyyyyToIso = (s: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s).trim());
    return m ? `${m[3]}-${m[2]}-${m[1]}` : new Date().toISOString().slice(0, 10);
};

function toCents(str: string): number {
    let s = String(str || "").trim();
    if (!s) return 0;

    // Remove currency/whitespace except digits, separators and minus
    s = s.replace(/[^\d,.\-]/g, "");

    let neg = false;
    if (s.endsWith("-")) { neg = true; s = s.slice(0, -1); }

    // 1.234,56  →  1234.56
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");

    let n = Number(s);
    if (!Number.isFinite(n)) n = 0;
    if (neg) n = -Math.abs(n);
    return Math.round(n * 100);
}

function looksLikeHeader(cells: string[]) {
    if (cells.length < 4) return false;
    const t = cells.map(norm);
    const hasL = t.some(x => x.startsWith("data lanc"));   // data lançamento
    const hasV = t.some(x => x.startsWith("data valor"));
    const hasD = t.some(x => x.startsWith("descricao"));
    const hasM = t.some(x => x.startsWith("montante") || x === "valor");
    return hasL && hasV && hasD && hasM;
}

function sliceToHeader(chunk: string, delimiter = ";") {
    const lines = chunk.replace(/\r\n?/g, "\n").split("\n");
    for (let i = 0; i < Math.min(lines.length, 200); i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const cells = line.split(delimiter).map(s => s.trim());
        if (looksLikeHeader(cells)) {
            return lines.slice(i).join("\n");
        }
    }
    return chunk;
}

// --- main: parse with Papa ---
export function parseMillenniumCsvWithPapa(csvText: string): RawCsvRow[] {
    // Bank files use ';' and we want empty-line pruning.
    const sliced = sliceToHeader(csvText, ";");

    const res = Papa.parse<string[]>(sliced, {
        delimiter: ";",
        header: false,
        skipEmptyLines: "greedy",
        dynamicTyping: false,
    });

    if (res.errors?.length) {
        // Non-fatal; you can log res.errors if you want
    }

    const rows: RawCsvRow[] = [];
    const data = res.data;

    // Expect columns:
    // [0] Data lançamento | [1] Data valor | [2] Descrição | [3] Montante | [4] Tipo | [5] Saldo
    for (let i = 1; i < data.length; i++) { // start after header row
        const r = data[i] || [];
        if (r.length < 5) continue;

        const dataValor = r[1]?.toString().trim() || "";
        // Extra guard: skip summary/footer lines
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataValor)) continue;

        const descricao = r[2]?.toString() ?? "";
        const montante = r[3]?.toString() ?? "0";
        const tipo = norm(r[4]?.toString() ?? "");

        let cents = toCents(montante);

        // If sign not obvious, infer from type
        const isDebit = /(debito|deb)/.test(tipo);
        const isCredit = /(credito|cred)/.test(tipo);
        if (isDebit) cents = -Math.abs(cents);
        if (isCredit) cents = Math.abs(cents);

        if (!descricao && cents === 0) continue;

        rows.push({
            date: ddmmyyyyToIso(dataValor),
            description: descricao,
            cents,
        });
    }

    return rows;
}
