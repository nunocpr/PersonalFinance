export type CategoryKind = "expense" | "income" | "transfer";

export interface Category {
    id: number;
    name: string;
    description?: string | null;
    parentId?: number | null;
    sortOrder: number;
    icon?: string | null;
    color?: string | null;
    type: CategoryKind;
    archived: boolean;
    children?: Category[];
}

export interface CreateCategoryDto {
    name: string;
    description?: string | null;
    parentId?: number | null;
    icon?: string | null;
    color?: string | null;
    type?: CategoryKind; // só para raiz; filhos herdam cor se quiseres
}

export interface UpdateCategoryDto {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    type?: CategoryKind;
    archived?: boolean;
}
