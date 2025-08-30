import { ListFilters } from "../types/transactions";

export function parseListFilters(q: any): ListFilters {
    const num = (v: any) => (v === undefined ? undefined : Number.isFinite(Number(v)) ? Number(v) : undefined);
    const orNullNum = (v: any) => {
        if (v === undefined) return undefined;
        if (v === null || v === "null") return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };
    const sortBy = q?.sortBy === "amount" ? "amount" : "date";
    const sortDir = q?.sortDir === "asc" ? "asc" : "desc";

    return {
        accountId: num(q?.accountId),
        // categoryId is NOT used in groupByCategory (we ignore it there),
        // but keep parsing for list endpoint & general consistency:
        categoryId: orNullNum(q?.categoryId),
        q: typeof q?.q === "string" ? q.q : undefined,
        from: typeof q?.from === "string" ? q.from : undefined,
        to: typeof q?.to === "string" ? q.to : undefined,
        sortBy,
        sortDir,
        page: num(q?.page),
        pageSize: num(q?.pageSize),
    };
}
