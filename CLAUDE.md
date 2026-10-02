# CLAUDE.md

> Keep this file short and stable. It is loaded into context every session,
> so a growing file costs tokens on every run. Change history belongs in
> CHANGELOG.md and in git, not here.

## Project
Apteka: offline pharmacy inventory and POS system (products, warehouse, sales, orders, suppliers, reports). UI text and user-facing API errors are in Russian.

## Commands
- install: `npm install` (root; postinstall installs backend and frontend)
- setup db: `npm run setup` (prisma generate, db push, seed)
- dev: `npm run dev` (backend :3001 + Vite frontend)
- build: `npm run build` (frontend: `tsc -b && vite build`)
- typecheck: `cd backend && npx tsc --noEmit` / `cd frontend && npx tsc --noEmit -p .`
- test / lint: none configured

## Architecture
- backend/src/index.ts: Express 5 entry; one router per module in `backend/src/routes/`
- backend/src/middleware/: `authMiddleware` (JWT) and `roleGuard(...roles)` in auth.ts, `errorHandler.ts`
- backend/prisma/schema.prisma: SQLite at `database/apteka.db`; seed in `prisma/seed.ts`; `prisma/migrations/` is gitignored, so use `db push`
- frontend/src: `pages/` (one per screen, POS in `pages/pos`), `components/`, `contexts/` (Auth, Theme), `lib/api.ts` (axios)
- Stack: React 19, Vite, Tailwind 4, Radix UI, react-hook-form + zod, recharts

## Conventions
- Roles: ADMIN, MANAGER, PHARMACIST (default), STOREKEEPER; backend uses `roleGuard`, frontend `ProtectedRoute roles={[...]}` in App.tsx and the menu config in `components/layout/Navbar.tsx` (keep both in sync)
- Login is user tile + 4-digit PIN (`{userId, pin}`); the PIN's bcrypt hash lives in `User.password`, validate with `isValidPin` from `middleware/auth.ts`; recovery: `npm run reset-pin -- <username> <pin>`
- Show request errors with `notifyError(err, fallback)` from `lib/utils.ts`, not an empty `catch`
- Stock changes go through `StockMovement`; wrap multi-table writes (sales, orders) in `prisma.$transaction`
- Backend is CommonJS TS run via tsx; frontend is ESM with the `@/` alias for `src/`
- Hooks in `.claude/` block edits to `.env*`, lockfiles, `backend/uploads/`, `database/*.db` and build output, and typecheck `.ts/.tsx` after each edit
