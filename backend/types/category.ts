export type CategoryKind = "expense" | "income" | "transfer";

export interface CreateCategoryDto {
    name: string;
    description?: string | null;
    parentId?: number | null;        // omit for a root category
    sortOrder?: number;              // optional, default to end
    icon?: string | null;
    color?: string | null;
    type?: CategoryKind;             // default "expense"
}

export interface UpdateCategoryDto {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    type?: CategoryKind;
    archived?: boolean;
}

export interface ReorderSiblingsDto {
    parentId?: number | null;        // null for root level
    orderedIds: number[];            // new order left→right (0..N-1)
}
