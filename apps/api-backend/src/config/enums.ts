export const TRANSACTION_TYPES = ['income', 'expense'] as const
export const ACCOUNT_TYPES = ['wallet', 'credit_card'] as const
export const TRANSACTION_STATUSES = ['pending', 'completed'] as const

export type TransactionType = 'income' | 'expense'
export type AccountType = 'wallet' | 'credit_card'
export type TransactionStatus = 'pending' | 'completed'
