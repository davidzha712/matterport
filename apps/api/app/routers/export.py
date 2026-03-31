from __future__ import annotations

import csv
import io
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse

from app.repository import get_space, list_project_records
from app.workflow_readiness import build_workflow_readiness

router = APIRouter(prefix="/export", tags=["export"])


def _sanitize_csv_cell(value: object) -> str:
    text = str(value)
    if text[:1] in {"=", "+", "-", "@"}:
        return f"'{text}"
    return text


def _ensure_space(space_id: str):
    space = get_space(space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


def _enforce_export_gate(space_id: str, *, strict: bool, require_publication_ready: bool = False):
    space = _ensure_space(space_id)
    readiness = build_workflow_readiness(space)

    if strict and not readiness.export_ready:
        raise HTTPException(
            status_code=409,
            detail="Space export blocked until all objects leave Needs Review",
        )

    if strict and require_publication_ready and not readiness.story_ready:
        raise HTTPException(
            status_code=409,
            detail="Publication export blocked until at least one object is Approved",
        )

    return space, readiness


def _build_iiif_manifest(space_id: str):
    space = _ensure_space(space_id)
    base_id = f"https://matterport.local/iiif/spaces/{space.id}"
    items = []

    for object_record in space.objects:
        canvas_id = f"{base_id}/canvas/{object_record.id}"
        items.append(
            {
                "id": canvas_id,
                "type": "Canvas",
                "label": {"en": [object_record.title]},
                "summary": {"en": [object_record.ai_summary or object_record.type]},
                "width": 1600,
                "height": 1000,
                "metadata": [
                    {"label": {"en": ["Room"]}, "value": {"en": [object_record.room_name]}},
                    {"label": {"en": ["Status"]}, "value": {"en": [object_record.status]}},
                    {"label": {"en": ["Disposition"]}, "value": {"en": [object_record.disposition]}},
                ],
                "items": [
                    {
                        "id": f"{canvas_id}/page",
                        "type": "AnnotationPage",
                        "items": [
                            {
                                "id": f"{base_id}/annotation/{object_record.id}",
                                "type": "Annotation",
                                "motivation": "commenting",
                                "body": {
                                    "type": "TextualBody",
                                    "format": "text/plain",
                                    "label": {"en": [object_record.title]},
                                    "value": object_record.ai_summary or object_record.title,
                                },
                                "target": canvas_id,
                            }
                        ],
                    }
                ],
            }
        )

    return {
        "@context": "http://iiif.io/api/presentation/3/context.json",
        "id": f"{base_id}/manifest",
        "type": "Manifest",
        "label": {"en": [space.name]},
        "summary": {"en": [space.summary]},
        "requiredStatement": {
            "label": {"en": ["Workflow Gate"]},
            "value": {"en": ["Human review remains required before publication and external distribution."]},
        },
        "items": items,
    }


@router.get("/all/csv")
def export_all_objects_csv(strict: bool = Query(default=False)) -> StreamingResponse:
    projects = list_project_records()

    if strict:
        blocked_spaces = [
            space.name
            for project in projects
            for space in project.spaces
            if not build_workflow_readiness(space).export_ready
        ]
        if blocked_spaces:
            raise HTTPException(
                status_code=409,
                detail="Global export blocked until every space is export-ready",
            )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Project", "Space", "ID", "Title", "Type", "Room", "Status", "Disposition", "AI Summary"])

    for project in projects:
        for space in project.spaces:
            for obj in space.objects:
                writer.writerow([
                    _sanitize_csv_cell(project.name),
                    _sanitize_csv_cell(space.name),
                    _sanitize_csv_cell(obj.id),
                    _sanitize_csv_cell(obj.title),
                    _sanitize_csv_cell(obj.type),
                    _sanitize_csv_cell(obj.room_name),
                    _sanitize_csv_cell(obj.status),
                    _sanitize_csv_cell(obj.disposition),
                    _sanitize_csv_cell(obj.ai_summary),
                ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=all_objects_export.csv"}
    )


@router.get("/spaces/{space_id}/csv")
def export_space_objects_csv(
    space_id: str,
    strict: bool = Query(default=False),
) -> StreamingResponse:
    space, _ = _enforce_export_gate(space_id, strict=strict)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Type", "Room", "Status", "Disposition", "AI Summary"])

    for obj in space.objects:
        writer.writerow([
            _sanitize_csv_cell(obj.id),
            _sanitize_csv_cell(obj.title),
            _sanitize_csv_cell(obj.type),
            _sanitize_csv_cell(obj.room_name),
            _sanitize_csv_cell(obj.status),
            _sanitize_csv_cell(obj.disposition),
            _sanitize_csv_cell(obj.ai_summary),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=space_{space_id}_objects.csv"}
    )


@router.get("/spaces/{space_id}/iiif-manifest")
def export_space_iiif_manifest(
    space_id: str,
    strict: bool = Query(default=False),
) -> JSONResponse:
    _enforce_export_gate(space_id, strict=strict, require_publication_ready=True)
    return JSONResponse(_build_iiif_manifest(space_id))
