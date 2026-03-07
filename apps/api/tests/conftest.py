import pytest

from app.repository import reset_repository_state


@pytest.fixture(autouse=True)
def reset_state() -> None:
    reset_repository_state()
