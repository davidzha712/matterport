import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.routers.ai import router as ai_router
from app.routers.annotations import router as annotations_router
from app.routers.export import router as export_router
from app.routers.health import router as health_router
from app.routers.integrations import router as integrations_router
from app.routers.projects import router as projects_router
from app.routers.providers import router as providers_router
from app.routers.spaces import router as spaces_router
from app.routers.workflows import router as workflows_router

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=()"
        return response


def create_app() -> FastAPI:
    app = FastAPI(
        title="Matterport Platform API",
        version="0.1.0",
        description="Backend scaffold for a reusable multi-project immersive platform.",
    )

    allowed_origins = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3100,http://127.0.0.1:3100,http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    try:
        from app.sanity_repository import SanityRepositoryError

        @app.exception_handler(SanityRepositoryError)
        async def sanity_error_handler(request: Request, exc: SanityRepositoryError) -> JSONResponse:
            logger.error("Sanity CMS error: %s", exc)
            return JSONResponse(status_code=502, content={"detail": "Content backend unavailable"})
    except ImportError:
        pass

    api_prefix = "/api/v1"
    app.include_router(ai_router, prefix=api_prefix)
    app.include_router(annotations_router, prefix=api_prefix)
    app.include_router(health_router, prefix=api_prefix)
    app.include_router(integrations_router, prefix=api_prefix)
    app.include_router(projects_router, prefix=api_prefix)
    app.include_router(providers_router, prefix=api_prefix)
    app.include_router(spaces_router, prefix=api_prefix)
    app.include_router(workflows_router, prefix=api_prefix)
    app.include_router(export_router, prefix=api_prefix)
    return app


app = create_app()
