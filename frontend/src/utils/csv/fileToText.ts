// Reads a File and returns text, trying a few encodings commonly used by PT banks.
export async function fileToText(file: File): Promise<string> {
    const buf = await file.arrayBuffer();

    const tryDec = (enc: string) => {
        try { return new TextDecoder(enc as any, { fatal: false }).decode(buf); }
        catch { return null; }
    };

    const utf8 = tryDec("utf-8");
    const win = tryDec("windows-1252");
    const iso = tryDec("iso-8859-1");

    // Prefer the first non-empty result
    return utf8 || win || iso || "";
}
