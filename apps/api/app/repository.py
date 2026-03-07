from __future__ import annotations

from collections.abc import Sequence

from app.ai.registry import build_provider_summaries
from app.mock_data import PROJECTS
from app.models import ProjectSummary, ProviderSummary, SpaceSummary


def list_projects() -> Sequence[ProjectSummary]:
    return PROJECTS


def get_project(project_id: str) -> ProjectSummary | None:
    return next((project for project in PROJECTS if project.id == project_id), None)


def list_spaces(project_id: str) -> Sequence[SpaceSummary] | None:
    project = get_project(project_id)
    if project is None:
        return None
    return project.spaces


def list_providers() -> Sequence[ProviderSummary]:
    return build_provider_summaries()
