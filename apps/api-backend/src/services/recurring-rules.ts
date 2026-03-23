import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { recurringRules, systemConfig, transactions } from '../db/schema.js'

function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function buildTransactionDate(year: number, month: number, dayOfMonth: number): string {
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = Math.min(dayOfMonth, daysInMonth)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export async function processRecurrences(): Promise<void> {
  const currentMonth = getCurrentMonth()

  const [config] = await db.select().from(systemConfig).limit(1)

  if (config?.lastRecurringCheck === currentMonth) {
    return
  }

  const activeRules = await db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.isActive, true))

  if (activeRules.length > 0) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const newTransactions = activeRules.map((rule) => ({
      description: rule.description,
      amount: rule.amount,
      category: rule.category,
      type: rule.type,
      status: 'pending' as const,
      accountType: rule.accountType,
      isRecurring: true,
      transactionDate: buildTransactionDate(year, month, rule.dayOfMonth),
      recurringRuleId: rule.id,
    }))

    await db.insert(transactions).values(newTransactions)
  }

  if (config) {
    await db
      .update(systemConfig)
      .set({ lastRecurringCheck: currentMonth, updatedAt: new Date() })
      .where(eq(systemConfig.id, config.id))
  } else {
    await db.insert(systemConfig).values({ lastRecurringCheck: currentMonth })
  }
}
