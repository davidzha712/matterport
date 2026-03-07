from app.routers.ai import router as ai_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.health import router as health_router
from app.routers.integrations import router as integrations_router
from app.routers.projects import router as projects_router
from app.routers.providers import router as providers_router
from app.routers.spaces import router as spaces_router
from app.routers.workflows import router as workflows_router
from app.routers.export import router as export_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Matterport Platform API",
        version="0.1.0",
        description="Backend scaffold for a reusable multi-project immersive platform.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    api_prefix = "/api/v1"
    app.include_router(ai_router, prefix=api_prefix)
    app.include_router(health_router, prefix=api_prefix)
    app.include_router(integrations_router, prefix=api_prefix)
    app.include_router(projects_router, prefix=api_prefix)
    app.include_router(providers_router, prefix=api_prefix)
    app.include_router(spaces_router, prefix=api_prefix)
    app.include_router(workflows_router, prefix=api_prefix)
    app.include_router(export_router, prefix=api_prefix)
    return app


app = create_app()
