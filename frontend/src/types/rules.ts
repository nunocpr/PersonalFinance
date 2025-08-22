// src/types/rules.ts
export type RuleKind = "DEBIT" | "CREDIT";

export interface TxRule {
    id: number;
    userId: number;
    name: string;
    pattern: string;
    isRegex: boolean;
    caseSensitive: boolean;
    priority: number;
    isActive: boolean;
    categoryId: number | null;
    kind: RuleKind | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRuleDto {
    name: string;
    pattern: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    isActive?: boolean;
    priority?: number;
    categoryId?: number | null;
    kind?: RuleKind | null;
}

export type UpdateRuleDto = Partial<CreateRuleDto>;
