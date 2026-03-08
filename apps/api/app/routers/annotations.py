from fastapi import APIRouter, HTTPException

from app import repository
from app.models import (
    AnnotationCreateRequest,
    AnnotationUpdateRequest,
    SpatialAnnotation,
)

router = APIRouter(prefix="/spaces/{space_id}/annotations", tags=["annotations"])


@router.get("", response_model=list[SpatialAnnotation])
def list_annotations(space_id: str) -> list[SpatialAnnotation]:
    return repository.list_annotations(space_id)


@router.post("", response_model=SpatialAnnotation, status_code=201)
def create_annotation(space_id: str, body: AnnotationCreateRequest) -> SpatialAnnotation:
    return repository.create_annotation(space_id, body)


@router.patch("/{annotation_id}", response_model=SpatialAnnotation)
def update_annotation(
    space_id: str, annotation_id: str, body: AnnotationUpdateRequest
) -> SpatialAnnotation:
    result = repository.update_annotation(space_id, annotation_id, body)
    if result is None:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return result


@router.delete("/{annotation_id}", status_code=204)
def delete_annotation(space_id: str, annotation_id: str) -> None:
    if not repository.delete_annotation(space_id, annotation_id):
        raise HTTPException(status_code=404, detail="Annotation not found")
