from fastapi import APIRouter, HTTPException

from app.models import ProjectListResponse, ProjectSummary, SpaceListResponse
from app.repository import get_project, list_projects, list_spaces

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
def get_projects() -> ProjectListResponse:
    return ProjectListResponse(items=list(list_projects()))


@router.get("/{project_id}", response_model=ProjectSummary)
def get_project_by_id(project_id: str) -> ProjectSummary:
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/spaces", response_model=SpaceListResponse)
def get_project_spaces(project_id: str) -> SpaceListResponse:
    spaces = list_spaces(project_id)
    if spaces is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return SpaceListResponse(items=list(spaces))

