import type { Category } from '@/config/categories'
import type { AccountType, TransactionType, TransactionStatus } from '@/config/enums'

export interface IdParams {
  id: string
}

export interface CreateRecurringRuleInput {
  description: string
  amount: number
  category: Category
  type: TransactionType
  accountType: AccountType
  dayOfMonth: number
}

export interface CreateTransactionInput {
  description: string
  amount: number
  category: Category
  type: TransactionType
  accountType: AccountType
  status: TransactionStatus
  transactionDate: string
}

export interface ListTransactionsFilters {
  type?: TransactionType
  accountType?: AccountType
  status?: TransactionStatus
  month?: string
  page?: number
  limit?: number
}
