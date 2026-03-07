from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.health import router as health_router
from app.routers.integrations import router as integrations_router
from app.routers.projects import router as projects_router
from app.routers.providers import router as providers_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Matterport Platform API",
        version="0.1.0",
        description="Backend scaffold for a reusable multi-project immersive platform.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    api_prefix = "/api/v1"
    app.include_router(health_router, prefix=api_prefix)
    app.include_router(integrations_router, prefix=api_prefix)
    app.include_router(projects_router, prefix=api_prefix)
    app.include_router(providers_router, prefix=api_prefix)
    return app


app = create_app()
