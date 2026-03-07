# Matterport Immersive Platform

Reusable multi-project immersive interaction platform for Matterport-driven estate, inventory, and museum-style exploration.

## Workspace layout

- `apps/web`: Next.js application shell for immersive navigation, review flows, and provider settings
- `apps/api`: FastAPI backend scaffold for projects, spaces, providers, and workflow APIs
- `docs/`: implementation plan and setup instructions

## Current implementation scope

Phase 1 sets up:

- multi-project home and space routing
- a full-screen immersive shell
- a Matterport embed integration boundary
- provider configuration UX placeholders
- backend API skeleton and tests

## Quick start

### Web

```bash
npm install
npm run dev:web
```

### API

```bash
uv sync --project apps/api
uv run --project apps/api pytest
uv run --project apps/api uvicorn app.main:app --reload --app-dir apps/api
```

## Environment

Copy `.env.example` to `.env.local` and fill in any available Matterport or provider credentials.

