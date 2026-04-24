# JUST Social

Monorepo for the JUST Social  platform.

## Repository Layout
- `frontend/` React + Vite application
- `frontend/public/` static assets served by Vite
- `frontend/src/` application source only
- `backend/` Express API, runnable agents, Supabase assets, and tests
- `backend/agents/` runnable AI agent code and Python dependencies
- `backend/supabase/` migrations, edge functions, and SQL bootstrap files
- `packages/shared/` shared constants and types
- `tools/agents/` agent support scripts
- `tools/frontend/` frontend asset/code generation helpers
- `tools/project/` project-wide setup utilities
- `tools/refactors/` one-off refactor scripts
- `tools/scratch/` disposable local test scripts
- `tools/experiments/` non-production prototypes and model experiments
- `tools/archive/` legacy code kept outside the active product tree
- `docs/archive/` archived planning documents
- `docs/agents/` operational guides for the AI agent
- `docs/reviews/` architecture and review notes
- `reports/` generated analysis artifacts

## Development
```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3002`

## Common Commands
```bash
npm run build
npm run test:backend
```

## Environment
- Root `.env.local` is still supported during the migration.
- Backend env loading checks `backend/.env.local`, then root `.env.local`, then `.env`.
- Frontend Vite env loading will read from the repo root.

## Repository Conventions
- The workspace uses a single root `package-lock.json`.
- Do not add `package-lock.json` files inside `frontend/`, `backend/`, or `packages/`.
- Keep non-product code out of `frontend/src/` and `backend/src/`.

