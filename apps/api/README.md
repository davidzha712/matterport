# Matterport Platform API

Minimal FastAPI scaffold for the multi-project immersive platform.

## Run

```bash
uv sync --project apps/api
uv run --project apps/api uvicorn app.main:app --reload
```

## Test

```bash
uv run --project apps/api pytest
```

