# Backend Plan — conta-ai

This document is the technical plan derived from spec.md.
It defines stack decisions, folder structure, database schema, API contracts, and implementation phases.

---

## 1. Stack Decisions

| Concern            | Choice                        | Reason                                                   |
|--------------------|-------------------------------|----------------------------------------------------------|
| Framework          | Fastify 5                     | Already in place                                         |
| Language           | TypeScript (strict, NodeNext) | Already in place                                         |
| ORM                | Drizzle ORM                   | Lightweight, TypeScript-first, close to SQL              |
| Migrations         | Drizzle Kit                   | Pairs with Drizzle ORM                                   |
| DB driver          | `postgres` (postgres.js)      | Recommended driver for Drizzle + PostgreSQL              |
| Validation         | Zod                           | Shared with frontend via packages/ in the future         |
| Enums in DB        | varchar + check constraints   | Flexible, easy to migrate as the project evolves         |
| Route structure    | One file per resource         | Simple, predictable, easy to navigate                    |

---

## 2. Folder Structure

```
apps/api-backend/
  src/
    routes/
      transactions.ts        # CRUD + confirm pending
      recurring-rules.ts     # CRUD + activate/deactivate
      summary.ts             # wallet balance, card invoice, monthly totals
      credit-cards.ts        # pay invoice, card config
    services/
      transactions.ts        # transaction business logic
      recurring-rules.ts     # recurring rules logic + startup recurrence processing
    db/
      schema.ts              # Drizzle table definitions + enum constants
      index.ts               # db client instance (postgres.js + drizzle)
    config/
      categories.ts          # fixed category values as const
      enums.ts               # type, account_type, status as const + Zod enums
    plugins/
      zod-errors.ts          # Fastify error handler for Zod validation errors
    server.ts                # Fastify instance, plugin registration, startup hook
  drizzle.config.ts          # Drizzle Kit config
  drizzle/
    migrations/              # generated migration files
```

---

## 3. Environment Variables

Already defined in `.env.example` at the repo root:

```
DATABASE_URL="postgresql://user:password@localhost:5432/db_name"
```

The `db/index.ts` will read `process.env.DATABASE_URL`.

---

## 4. Config Files

### `config/categories.ts`
```ts
export const CATEGORIES = ['house', 'food', 'transport', 'health', 'payment', 'receive'] as const
export type Category = typeof CATEGORIES[number]
```

### `config/enums.ts`
```ts
export const TRANSACTION_TYPES = ['income', 'expense'] as const
export const ACCOUNT_TYPES = ['wallet', 'credit_card'] as const
export const TRANSACTION_STATUSES = ['pending', 'completed'] as const

export type TransactionType = typeof TRANSACTION_TYPES[number]
export type AccountType = typeof ACCOUNT_TYPES[number]
export type TransactionStatus = typeof TRANSACTION_STATUSES[number]
```

These are the source of truth. `db/schema.ts` check constraints and Zod schemas in routes/services will both import from here.

---

## 5. Database Schema (`db/schema.ts`)

### `transactions`
```
id                serial PK
description       varchar(255) NOT NULL
amount            integer NOT NULL                        -- in cents
category          varchar(50) NOT NULL CHECK (category IN (...CATEGORIES))
type              varchar(20) NOT NULL CHECK (type IN ('income', 'expense'))
status            varchar(20) NOT NULL CHECK (status IN ('pending', 'completed'))
account_type      varchar(20) NOT NULL CHECK (account_type IN ('wallet', 'credit_card'))
is_recurring      boolean NOT NULL DEFAULT false
transaction_date  date NOT NULL
recurring_rule_id integer REFERENCES recurring_rules(id) ON DELETE SET NULL
created_at        timestamp NOT NULL DEFAULT now()
updated_at        timestamp NOT NULL DEFAULT now()
```

Indexes: `status`, `type`, `account_type`, `transaction_date`

### `recurring_rules`
```
id               serial PK
description      varchar(255) NOT NULL
amount           integer NOT NULL                         -- in cents
category         varchar(50) NOT NULL CHECK (...)
type             varchar(20) NOT NULL CHECK (...)
account_type     varchar(20) NOT NULL CHECK (...)
day_of_month     integer NOT NULL CHECK (day_of_month BETWEEN 1 AND 31)
is_active        boolean NOT NULL DEFAULT true
created_at       timestamp NOT NULL DEFAULT now()
updated_at       timestamp NOT NULL DEFAULT now()
```

### `system_config`
```
id                    serial PK
last_recurring_check  varchar(7) NOT NULL                 -- format: 'YYYY-MM'
created_at            timestamp NOT NULL DEFAULT now()
updated_at            timestamp NOT NULL DEFAULT now()
```

Single row (singleton). Used to prevent duplicate recurrence generation in the same month.

### `credit_cards`
```
id           serial PK
name         varchar(100) NOT NULL
card_limit   integer NOT NULL DEFAULT 0                   -- in cents
closing_day  integer NOT NULL CHECK (closing_day BETWEEN 1 AND 31)
due_day      integer NOT NULL CHECK (due_day BETWEEN 1 AND 31)
is_active    boolean NOT NULL DEFAULT true
created_at   timestamp NOT NULL DEFAULT now()
updated_at   timestamp NOT NULL DEFAULT now()
```

Included in the schema and has a dedicated route (`routes/credit-cards.ts`).

---

## 6. API Contract

All amounts in cents. All dates as ISO strings (`YYYY-MM-DD`).

### Transactions — `routes/transactions.ts`

| Method | Path                        | Description                 |
|--------|-----------------------------|-----------------------------|
| POST   | /transactions               | Create manual transaction   |
| GET    | /transactions               | List transactions           |
| GET    | /transactions/:id           | Get single transaction      |
| PUT    | /transactions/:id           | Update transaction          |
| DELETE | /transactions/:id           | Delete transaction          |
| PATCH  | /transactions/:id/confirm   | Confirm pending → completed |

**GET /transactions query params:**
- `type` — income | expense
- `account_type` — wallet | credit_card
- `status` — pending | completed
- `month` — YYYY-MM (filters by transaction_date)

**POST /transactions body:**
```ts
{
  description: string
  amount: number            // cents, positive integer
  category: Category
  type: TransactionType
  account_type: AccountType
  status: TransactionStatus
  transaction_date: string  // YYYY-MM-DD
}
```

---

### Recurring Rules — `routes/recurring-rules.ts`

| Method | Path                              | Description               |
|--------|-----------------------------------|---------------------------|
| POST   | /recurring-rules                  | Create rule               |
| GET    | /recurring-rules                  | List all rules            |
| PUT    | /recurring-rules/:id              | Update rule               |
| DELETE | /recurring-rules/:id              | Delete rule               |
| PATCH  | /recurring-rules/:id/activate     | Set is_active = true      |
| PATCH  | /recurring-rules/:id/deactivate   | Set is_active = false     |

**POST /recurring-rules body:**
```ts
{
  description: string
  amount: number          // cents, positive integer
  category: Category
  type: TransactionType
  account_type: AccountType
  day_of_month: number    // 1–31
}
```

---

### Summary — `routes/summary.ts`

| Method | Path                  | Description                               |
|--------|-----------------------|-------------------------------------------|
| GET    | /summary              | Full dashboard summary                    |
| GET    | /summary/wallet       | Wallet balance (completed wallet txns)    |
| GET    | /summary/credit-card  | Current month credit card invoice total   |
| GET    | /summary/monthly      | Monthly income/expense totals             |

**GET /summary/monthly query params:**
- `month` — YYYY-MM (defaults to current month)

**GET /summary response:**
```ts
{
  walletBalance: number       // cents
  creditCardInvoice: number   // cents
  monthlyIncome: number       // cents
  monthlyExpenses: number     // cents
  month: string               // YYYY-MM
}
```

---

### Credit Cards — `routes/credit-cards.ts`

| Method | Path                        | Description                            |
|--------|-----------------------------|----------------------------------------|
| POST   | /credit-cards               | Create card config                     |
| GET    | /credit-cards               | List cards                             |
| PUT    | /credit-cards/:id           | Update card                            |
| DELETE | /credit-cards/:id           | Delete card                            |
| POST   | /credit-cards/:id/pay       | Pay invoice (creates wallet expense)   |

**POST /credit-cards/:id/pay body:**
```ts
{
  amount: number        // cents — amount being paid
  payment_date: string  // YYYY-MM-DD
}
```

This creates a new `expense` transaction: `account_type = wallet`, `status = completed`.

---

## 7. Services

### `services/transactions.ts`
Handles all transaction business logic called by `routes/transactions.ts`:
- create, list (with filters), getById, update, delete, confirm

### `services/recurring-rules.ts`
Handles recurring rule logic called by `routes/recurring-rules.ts`, plus the startup recurrence processing:

**Startup recurrence flow** (called once in `server.ts` after DB is ready):
```
1. Query system_config for last_recurring_check
2. Get current month as 'YYYY-MM'
3. If last_recurring_check === current month → skip (already processed)
4. Fetch all recurring_rules WHERE is_active = true
5. For each rule:
   - Create a transaction:
     - description, amount, category, type, account_type from the rule
     - transaction_date = current year/month + rule.day_of_month
     - status = pending
     - is_recurring = true
     - recurring_rule_id = rule.id
6. UPSERT system_config SET last_recurring_check = current month
```

---

## 8. Error Handling

- Zod validation errors → `400 Bad Request` with field-level messages
- Resource not found (by id) → `404 Not Found`
- Unexpected errors → `500 Internal Server Error` with generic message (no internals leaked)
- Handled in `plugins/zod-errors.ts` registered as a Fastify plugin in `server.ts`

---

## 9. Implementation Phases

### Phase 1 — Setup
- [x] Install dependencies (drizzle-orm, postgres, zod, drizzle-kit)
- [x] Create `drizzle.config.ts`
- [x] Create `db/index.ts` (db client)
- [x] Create `config/categories.ts` and `config/enums.ts`

### Phase 2 — Database Schema + Migration
- [x] Write `db/schema.ts` (all 4 tables + enum constants)
- [x] Run `drizzle-kit generate` to create initial migration
- [x] Run `drizzle-kit migrate` to apply to local DB

### Phase 3 — Services
- [x] Implement `services/recurring-rules.ts` (recurrence processing + rule logic)
- [x] Implement `services/transactions.ts` (transaction logic)
- [x] Hook recurrence processing into `server.ts` startup

### Phase 4 — Routes
- [x] `routes/transactions.ts`
- [x] `routes/recurring-rules.ts`
- [x] `routes/summary.ts`
- [x] `routes/credit-cards.ts`

### Phase 5 — Error Handling Plugin
- [x] Implement `plugins/zod-errors.ts`
- [x] Register in `server.ts`

---

## 10. Open Points (to refine before or during implementation)

- Should `GET /transactions` be paginated, or is a simple list acceptable for MVP?
- Should the `system_config` table ever have more than one row, or is it always a singleton?
