from __future__ import annotations

import csv
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.repository import get_space, list_project_records

router = APIRouter(prefix="/export", tags=["export"])


def _sanitize_csv_cell(value: object) -> str:
    text = str(value)
    if text[:1] in {"=", "+", "-", "@"}:
        return f"'{text}"
    return text


@router.get("/all/csv")
def export_all_objects_csv() -> StreamingResponse:
    projects = list_project_records()
    
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
def export_space_objects_csv(space_id: str) -> StreamingResponse:
    space = get_space(space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")

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
