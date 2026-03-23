import { and, eq, gte, lt, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@/db'
import { transactions } from '@/db/schema'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthRange(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number)
  const start = `${year}-${String(m).padStart(2, '0')}-01`
  const nextDate = new Date(year, m, 1)
  const end = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`
  return { start, end }
}

async function getWalletBalance(): Promise<number> {
  const [result] = await db
    .select({
      balance: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.accountType, 'wallet'), eq(transactions.status, 'completed')))
  return Number(result.balance)
}

async function getCreditCardInvoice(month: string): Promise<number> {
  const { start, end } = getMonthRange(month)
  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(amount), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountType, 'credit_card'),
        eq(transactions.type, 'expense'),
        gte(transactions.transactionDate, start),
        lt(transactions.transactionDate, end),
      ),
    )
  return Number(result.total)
}

async function getMonthlyTotals(month: string): Promise<{ income: number; expenses: number }> {
  const { start, end } = getMonthRange(month)
  const [result] = await db
    .select({
      income: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)`,
      expenses: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, 'completed'),
        gte(transactions.transactionDate, start),
        lt(transactions.transactionDate, end),
      ),
    )
  return { income: Number(result.income), expenses: Number(result.expenses) }
}

const monthQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
})

export async function summaryRoutes(app: FastifyInstance) {
  app.get('/summary', async (_request, reply) => {
    const month = getCurrentMonth()
    const [walletBalance, creditCardInvoice, monthly] = await Promise.all([
      getWalletBalance(),
      getCreditCardInvoice(month),
      getMonthlyTotals(month),
    ])
    return reply.send({
      walletBalance,
      creditCardInvoice,
      monthlyIncome: monthly.income,
      monthlyExpenses: monthly.expenses,
      month,
    })
  })

  app.get('/summary/wallet', async (_request, reply) => {
    const balance = await getWalletBalance()
    return reply.send({ walletBalance: balance })
  })

  app.get('/summary/credit-card', async (_request, reply) => {
    const month = getCurrentMonth()
    const total = await getCreditCardInvoice(month)
    return reply.send({ creditCardInvoice: total, month })
  })

  app.get('/summary/monthly', async (request, reply) => {
    const { month } = monthQuery.parse(request.query)
    const target = month ?? getCurrentMonth()
    const totals = await getMonthlyTotals(target)
    return reply.send({ ...totals, month: target })
  })
}
