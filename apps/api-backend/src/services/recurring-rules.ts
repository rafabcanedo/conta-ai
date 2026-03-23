import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { recurringRules, systemConfig, transactions } from '@/db/schema'
import { CreateRecurringRuleInput } from '@/types'

export async function createRule(input: CreateRecurringRuleInput) {
  const [rule] = await db.insert(recurringRules).values(input).returning()
  return rule
}

export async function listRules() {
  return await db.select().from(recurringRules)
}

export async function getRuleById(id: number) {
  const [rule] = await db.select().from(recurringRules).where(eq(recurringRules.id, id))
  return rule ?? null
}

export async function updateRule(id: number, input: Partial<CreateRecurringRuleInput>) {
  const [rule] = await db
    .update(recurringRules)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(recurringRules.id, id))
    .returning()
  return rule ?? null
}

export async function deleteRule(id: number) {
  const [rule] = await db.delete(recurringRules).where(eq(recurringRules.id, id)).returning()
  return rule ?? null
}

export async function activateRule(id: number) {
  const [rule] = await db
    .update(recurringRules)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(recurringRules.id, id))
    .returning()
  return rule ?? null
}

export async function deactivateRule(id: number) {
  const [rule] = await db
    .update(recurringRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(recurringRules.id, id))
    .returning()
  return rule ?? null
}

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
