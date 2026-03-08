import os

import pytest

from app.repository import reset_repository_state
from app.routers.ai import _get_ai_router


@pytest.fixture(autouse=True)
def reset_state() -> None:
    os.environ["MATTERPORT_CONTENT_BACKEND"] = "memory"
    reset_repository_state()
    _get_ai_router.cache_clear()
