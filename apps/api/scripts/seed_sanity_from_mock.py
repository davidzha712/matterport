from __future__ import annotations

import re

import httpx

from app.ai.registry import build_provider_summaries
from app.mock_data import PROJECT_RECORDS
from app.settings import get_content_repository_settings


def _slugify(value: str) -> str:
    lowered = value.strip().lower()
    lowered = re.sub(r"[^a-z0-9]+", "-", lowered)
    return lowered.strip("-") or "item"


def _reference(document_id: str) -> dict[str, str]:
    return {"_type": "reference", "_ref": document_id}


def _build_mutations() -> list[dict]:
    mutations: list[dict] = []

    for project_index, project in enumerate(PROJECT_RECORDS):
        project_doc_id = f"spaceProject.{project.id}"
        mutations.append(
            {
                "createOrReplace": {
                    "_id": project_doc_id,
                    "_type": "spaceProject",
                    "projectId": project.id,
                    "title": project.name,
                    "slug": {"_type": "slug", "current": _slugify(project.name)},
                    "vertical": project.vertical.lower(),
                    "status": project.status,
                    "summary": project.summary,
                }
            }
        )

        for space_index, space in enumerate(project.spaces):
            space_doc_id = f"spaceRecord.{space.id}"
            mutations.append(
                {
                    "createOrReplace": {
                        "_id": space_doc_id,
                        "_type": "spaceRecord",
                        "spaceId": space.id,
                        "title": space.name,
                        "project": _reference(project_doc_id),
                        "matterportModelSid": space.matterport_model_sid,
                        "mode": space.mode,
                        "summary": space.summary,
                        "sortOrder": (project_index + 1) * 100 + space_index,
                    }
                }
            )

            room_doc_ids: dict[str, str] = {}
            for room_index, room in enumerate(space.rooms):
                room_doc_id = f"roomRecord.{space.id}.{room.id}"
                room_doc_ids[room.id] = room_doc_id
                mutations.append(
                    {
                        "createOrReplace": {
                            "_id": room_doc_id,
                            "_type": "roomRecord",
                            "roomId": room.id,
                            "title": room.name,
                            "space": _reference(space_doc_id),
                            "priorityBand": room.priority_band,
                            "recommendation": room.recommendation,
                            "summary": room.summary,
                            "sortOrder": (space_index + 1) * 100 + room_index,
                        }
                    }
                )

            for object_index, object_record in enumerate(space.objects):
                object_doc_id = f"objectRecord.{space.id}.{object_record.id}"
                document = {
                    "_id": object_doc_id,
                    "_type": "objectRecord",
                    "objectId": object_record.id,
                    "title": object_record.title,
                    "space": _reference(space_doc_id),
                    "objectType": object_record.type,
                    "status": object_record.status,
                    "disposition": object_record.disposition,
                    "aiSummary": object_record.ai_summary,
                    "sortOrder": (space_index + 1) * 100 + object_index,
                }
                room_doc_id = room_doc_ids.get(object_record.room_id)
                if room_doc_id:
                    document["room"] = _reference(room_doc_id)

                mutations.append({"createOrReplace": document})

    for provider in build_provider_summaries():
        provider_doc_id = f"aiProviderProfile.{provider.id}"
        mutations.append(
            {
                "createOrReplace": {
                    "_id": provider_doc_id,
                    "_type": "aiProviderProfile",
                    "title": provider.label,
                    "providerId": provider.id,
                    "status": "Active" if provider.configured else "Pilot",
                    "preferredFor": provider.preferred_for,
                    "configured": provider.configured,
                    "specialty": ", ".join(provider.preferred_for[:2]),
                    "fallbackClass": provider.task_classes[0] if provider.task_classes else "generalist",
                    "notes": "",
                }
            }
        )

    return mutations


def main() -> None:
    settings = get_content_repository_settings()
    if not settings.sanity_project_id or not settings.sanity_dataset:
        raise SystemExit("Missing SANITY_PROJECT_ID/SANITY_DATASET or NEXT_PUBLIC_SANITY_* configuration.")
    if not settings.sanity_write_token:
        raise SystemExit("Missing SANITY_API_WRITE_TOKEN.")

    url = (
        f"https://{settings.sanity_project_id}.api.sanity.io/"
        f"v{settings.sanity_api_version}/data/mutate/{settings.sanity_dataset}"
    )
    headers = {
        "Authorization": f"Bearer {settings.sanity_write_token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            url,
            params={"visibility": "sync"},
            headers=headers,
            json={"mutations": _build_mutations()},
        )
        response.raise_for_status()

    print("Seeded Sanity content from mock fixtures.")


if __name__ == "__main__":
    main()
