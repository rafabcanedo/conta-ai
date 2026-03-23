import { and, count, eq, gte, lt } from 'drizzle-orm'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { CreateTransactionInput, ListTransactionsFilters } from '@/types'

export async function createTransaction(input: CreateTransactionInput) {
  const [transaction] = await db.insert(transactions).values(input).returning()
  return transaction
}

export async function listTransactions(filters: ListTransactionsFilters = {}) {
  const { page = 1, limit = 20 } = filters
  const offset = (page - 1) * limit
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

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db.select({ total: count() }).from(transactions).where(where)
  const data = await db.select().from(transactions).where(where).limit(limit).offset(offset)

  return { data, total: Number(total), page, limit }
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
