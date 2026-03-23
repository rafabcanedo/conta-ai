import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
  check,
  index,
} from 'drizzle-orm/pg-core'
import { ACCOUNT_TYPES, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '../config/enums.js'
import { CATEGORIES } from '../config/categories.js'

export const recurringRules = pgTable('recurring_rules', {
  id: serial('id').primaryKey(),
  description: varchar('description', { length: 255 }).notNull(),
  amount: integer('amount').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(),
  dayOfMonth: integer('day_of_month').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  check('recurring_rules_category_check', sql`${table.category} IN (${sql.raw(CATEGORIES.map(c => `'${c}'`).join(', '))})`),
  check('recurring_rules_type_check', sql`${table.type} IN (${sql.raw(TRANSACTION_TYPES.map(t => `'${t}'`).join(', '))})`),
  check('recurring_rules_account_type_check', sql`${table.accountType} IN (${sql.raw(ACCOUNT_TYPES.map(a => `'${a}'`).join(', '))})`),
  check('recurring_rules_day_of_month_check', sql`${table.dayOfMonth} BETWEEN 1 AND 31`),
])

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  description: varchar('description', { length: 255 }).notNull(),
  amount: integer('amount').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(),
  isRecurring: boolean('is_recurring').notNull().default(false),
  transactionDate: date('transaction_date').notNull(),
  recurringRuleId: integer('recurring_rule_id').references(() => recurringRules.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  check('transactions_category_check', sql`${table.category} IN (${sql.raw(CATEGORIES.map(c => `'${c}'`).join(', '))})`),
  check('transactions_type_check', sql`${table.type} IN (${sql.raw(TRANSACTION_TYPES.map(t => `'${t}'`).join(', '))})`),
  check('transactions_status_check', sql`${table.status} IN (${sql.raw(TRANSACTION_STATUSES.map(s => `'${s}'`).join(', '))})`),
  check('transactions_account_type_check', sql`${table.accountType} IN (${sql.raw(ACCOUNT_TYPES.map(a => `'${a}'`).join(', '))})`),
  index('transactions_status_idx').on(table.status),
  index('transactions_type_idx').on(table.type),
  index('transactions_account_type_idx').on(table.accountType),
  index('transactions_date_idx').on(table.transactionDate),
])

export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  lastRecurringCheck: varchar('last_recurring_check', { length: 7 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const creditCards = pgTable('credit_cards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  cardLimit: integer('card_limit').notNull().default(0),
  closingDay: integer('closing_day').notNull(),
  dueDay: integer('due_day').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  check('credit_cards_closing_day_check', sql`${table.closingDay} BETWEEN 1 AND 31`),
  check('credit_cards_due_day_check', sql`${table.dueDay} BETWEEN 1 AND 31`),
])

export const recurringRulesRelations = relations(recurringRules, ({ many }) => ({
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  recurringRule: one(recurringRules, {
    fields: [transactions.recurringRuleId],
    references: [recurringRules.id],
  }),
}))
