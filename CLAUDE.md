# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Conta-AI is a personal finance management system (no authentication, single-user, local use). It tracks wallet and credit card transactions, handles recurring transactions, and generates financial dashboard data.

## Monorepo Structure

npm workspaces monorepo with two apps:
- `apps/api-backend` — Fastify 5 REST API on port 3333
- `apps/web-frontend` — React 19 + TanStack Router SPA on port 3000
- `packages/shared.ts` — Placeholder for shared types (currently empty)

## Commands

### Root (run both apps)
```bash
npm run dev:web      # starts web-frontend
npm run dev:api      # starts api-backend
```

### API Backend (`apps/api-backend`)
```bash
npm run dev          # tsx watch src/server.ts (hot reload)
npm run build        # tsc compile to dist/
npm run start        # node dist/server.js
```

### Web Frontend (`apps/web-frontend`)
```bash
npm run dev          # Vite dev server on port 3000
npm run build        # production build
npm run test         # vitest run
npm run lint         # biome lint
npm run format       # biome format
npm run check        # biome check (lint + format)
```

### Database
```bash
docker compose up -d   # starts PostgreSQL 17 on localhost:5432
```

Copy `.env.example` to `.env` and fill in credentials before starting.

## Architecture

### Backend (`apps/api-backend`)
- **Entry**: `src/server.ts` — Fastify server on `0.0.0.0:3333`
- **Routes**: `src/routes/` — API route handlers
- **Services**: `src/services/` — Business logic
- **DB**: `src/db/` — Database layer
- **Module system**: NodeNext (ESM), TypeScript strict mode
- **Logging**: Pino with pino-pretty

### Frontend (`apps/web-frontend`)
- **Routing**: TanStack Router with file-based routing in `src/routes/`
  - `__root.tsx` — root layout (Header, Footer, devtools)
  - `index.tsx`, `about.tsx`, `dashboard.tsx` — pages
- **Components**: `src/components/` — shared components; `src/components/ui/` — shadcn/ui components (radix-nova style)
- **Path aliases**: `#/*` and `@/*` both map to `src/`
- **Styling**: Tailwind CSS 4 with CSS variable design tokens (custom color palette: sea-ink, lagoon-deep, island-shell)
- **Data fetching**: TanStack React Query
- **Code quality**: Biome 2.4 (double quotes, tab indentation)

### Data Model (spec — not yet implemented)
Key entities per `apps/api-backend/docs/spec.md`:
- `transactions` — all income/expense records (amounts in cents); `account_type`: wallet | credit_card; `status`: pending | completed
- `recurring_rules` — templates for recurring transactions, processed on startup
- `credit_cards` — card metadata (closing/due days)
- `system_config` — tracks `last_recurring_check` to prevent duplicate processing

Fixed categories: `house`, `food`, `transport`, `health`, `payment`, `receive`

Balance is calculated dynamically from transactions (not persisted).

### Backend ↔ Frontend
Not yet integrated. Frontend talks to backend at port 3333; CORS not yet configured.
