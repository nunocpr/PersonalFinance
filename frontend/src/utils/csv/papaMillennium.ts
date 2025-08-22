import Papa from "papaparse";

export type RawCsvRow = { date: string; description: string; cents: number };

function sanitize(s: string) {
    return String(s ?? "")
        .replace(/^\uFEFF/, "")
        .replace(/[\u200E\u200F]/g, "")   // LRM/RLM
        .replace(/\u00A0/g, " ")          // NBSP -> space
        .trim();
}

function toIsoDatePT(s: string): string | null {
    const t = sanitize(s);
    // Accept 1–2 digit day/month, separators / - .
    const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(t);
    if (!m) return null;
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1900)) return null;
    const dd = String(d).padStart(2, "0");
    const mm = String(mo).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

function toCents(raw: string): number {
    let s = sanitize(raw).replace(/\u2212/g, "-"); // Unicode minus -> ASCII
    if (!s) return 0;
    // "1.234,56" -> "1234.56"
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function parseWithEncoding(file: File, encoding: string): Promise<string[][]> {
    return new Promise((resolve, reject) => {
        Papa.parse<string[]>(file, {
            encoding,
            delimiter: ";",
            skipEmptyLines: "greedy",
            complete: (res) => resolve(res.data || []),
            error: (err) => reject(err),
        });
    });
}

function norm(s: string) {
    return sanitize(s)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function findHeaderIndex(rows: string[][]): number {
    return rows.findIndex((r) => {
        const a = norm(r[0] || "");
        const b = norm(r[1] || "");
        return a.startsWith("data lancamento") && b.startsWith("data valor");
    });
}

/** Robust Millennium CSV parser (reads File directly, handles encodings). */
export async function parseMillenniumCsvFromFile(file: File): Promise<RawCsvRow[]> {
    const encodings = ["utf-8", "windows-1252", "iso-8859-1", "utf-16le"];

    for (const enc of encodings) {
        try {
            const rows = await parseWithEncoding(file, enc);
            const header = findHeaderIndex(rows);
            if (header === -1) continue;

            const out: RawCsvRow[] = [];

            for (let i = header + 1; i < rows.length; i++) {
                const r = rows[i] || [];
                if (r.length < 5) continue;

                const dataLanc = r[0] || "";
                const dataValor = r[1] || "";
                const descricao = r[2] || "";
                const montante = r[3] || "";
                const tipo = norm(r[4] || "");

                // Try both date columns; accept if either parses.
                const isoValor = toIsoDatePT(dataValor);
                const isoLanc = toIsoDatePT(dataLanc);
                const iso = isoValor ?? isoLanc;
                if (!iso) continue; // both cells failed -> likely footer/blank

                let cents = toCents(montante);
                // Ensure sign from Tipo
                if (/debito|deb/i.test(tipo)) cents = -Math.abs(cents);
                else if (/credito|cred/i.test(tipo)) cents = Math.abs(cents);

                // Ignore rows with no description AND zero amount
                if (!descricao.trim() && cents === 0) continue;

                out.push({ date: iso, description: sanitize(descricao), cents });
            }

            if (out.length) return out;
            // else try next encoding
        } catch {
            // try next encoding
        }
    }

    return [];
}
