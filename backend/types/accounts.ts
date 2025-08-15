// types/accounts.ts
export type CreateAccountDto = {
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'investment' | 'other';
    balance?: bigint | number;        // store in cents; prefer bigint internally
    description?: string | null;
    userId: number;                  // if you still pass internal user id to repo
};

export type UpdateAccountDto = Partial<{
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'investment' | 'other';
    balance: bigint | number;
    description: string | null;
}>;
