import { and, eq, gte, lt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { transactions } from '../db/schema.js'
import type { Category } from '../config/categories.js'
import type { AccountType, TransactionStatus, TransactionType } from '../config/enums.js'

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
}

export async function createTransaction(input: CreateTransactionInput) {
  const [transaction] = await db.insert(transactions).values(input).returning()
  return transaction
}

export async function listTransactions(filters: ListTransactionsFilters = {}) {
  const conditions = []

  if (filters.type) conditions.push(eq(transactions.type, filters.type))
  if (filters.accountType) conditions.push(eq(transactions.accountType, filters.accountType))
  if (filters.status) conditions.push(eq(transactions.status, filters.status))
  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const nextDate = new Date(year, month, 1)
    const end = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`
    conditions.push(gte(transactions.transactionDate, start))
    conditions.push(lt(transactions.transactionDate, end))
  }

  return await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
}

export async function getTransactionById(id: number) {
  const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id))
  return transaction ?? null
}

export async function updateTransaction(id: number, input: Partial<CreateTransactionInput>) {
  const [transaction] = await db
    .update(transactions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning()
  return transaction ?? null
}

export async function deleteTransaction(id: number) {
  const [transaction] = await db.delete(transactions).where(eq(transactions.id, id)).returning()
  return transaction ?? null
}

export async function confirmTransaction(id: number) {
  const [transaction] = await db
    .update(transactions)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning()
  return transaction ?? null
}
