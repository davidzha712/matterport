from __future__ import annotations

import os

from app.models import (
    ObjectRecord,
    ProjectRecord,
    ProjectSummary,
    ReviewQueueItem,
    RoomRecord,
    SpaceRecord,
    SpaceSummary,
    WorkflowSummary,
)


PRIMARY_MODEL_SID = os.getenv("NEXT_PUBLIC_MATTERPORT_MODEL_SID") or "oyaicKWaEQw"


PROJECT_RECORDS: list[ProjectRecord] = [
    ProjectRecord(
        id="estate-orchard",
        name="Orchard Estate Review",
        status="Active",
        summary=(
            "Mehrgeschossiger Nachlass-Workflow fuer Behalten, Verkaufen, Spenden und "
            "Archivieren in klaren Review-Stufen."
        ),
        vertical="Estate",
        spaces=[
            SpaceRecord(
                id="orchard-main-house",
                matterportModelSid=PRIMARY_MODEL_SID,
                mode="estate",
                name="Main House",
                projectId="estate-orchard",
                projectName="Orchard Estate Review",
                summary=(
                    "Grosser Wohnrundgang mit Moebeln, Archivmaterialien und "
                    "dispositionsrelevanten Objekten ueber mehrere Raeumlichkeiten."
                ),
                rooms=[
                    RoomRecord(
                        id="living-room",
                        name="Living Room",
                        objectIds=["walnut-cabinet", "mantel-clock"],
                        pendingReviewCount=1,
                        priorityBand="High",
                        recommendation=(
                            "Disposition bestaetigen und fuer wertige Objekte "
                            "detailliertere Aufnahmen sichern."
                        ),
                        summary=(
                            "Dichter Raum mit wahrscheinlich wertigen Moebeln und "
                            "gemischten sentimentalen Objekten."
                        ),
                    ),
                    RoomRecord(
                        id="study",
                        name="Study",
                        objectIds=["atlas-desk", "archive-box"],
                        pendingReviewCount=1,
                        priorityBand="Medium",
                        recommendation=(
                            "Papierbestaende vor jeder Aussonderung archivisch pruefen."
                        ),
                        summary=(
                            "Papierlastiger Raum mit Unterlagen, Regalen und einem "
                            "zentralen Schreibtischcluster."
                        ),
                    ),
                ],
                objects=[],
                workflow=WorkflowSummary(
                    approvedCount=1,
                    pendingReviewCount=2,
                    reviewedCount=1,
                ),
            )
        ],
    ),
    ProjectRecord(
        id="museum-lantern",
        name="Lantern House Digital Exhibition",
        status="Pilot",
        summary=(
            "Museumsartige Erzaehlung mit Fuehrungen, Sammlungsmetadaten und "
            "Objektkarten ueber einem digitalen Zwilling."
        ),
        vertical="Museum",
        spaces=[
            SpaceRecord(
                id="lantern-gallery",
                matterportModelSid=None,
                mode="museum",
                name="North Gallery",
                projectId="museum-lantern",
                projectName="Lantern House Digital Exhibition",
                summary=(
                    "Kuratiertes Galerieumfeld fuer Story-Modus, Objektmetadaten und "
                    "spaetere Deep-Zoom-Detailansichten."
                ),
                rooms=[
                    RoomRecord(
                        id="intro-hall",
                        name="Intro Hall",
                        objectIds=["brass-lantern", "visitor-map"],
                        pendingReviewCount=0,
                        priorityBand="Low",
                        recommendation=(
                            "Nach finaler Pruefung der Beschriftung bereit fuer den "
                            "oeffentlichen Story-Modus."
                        ),
                        summary=(
                            "Einfuehrender Schwellenraum, der die gefuehrte Erzaehlung "
                            "verankert."
                        ),
                    )
                ],
                objects=[
                    ObjectRecord(
                        aiSummary=(
                            "Interpretatives Objekt mit starkem Erzaehlwert; ideal in "
                            "Kombination mit hochaufgeloesten Bildkacheln und "
                            "Konservierungsnotizen."
                        ),
                        disposition="Keep",
                        id="brass-lantern",
                        roomId="intro-hall",
                        roomName="Intro Hall",
                        status="Reviewed",
                        title="Brass Lantern",
                        type="Object",
                    ),
                    ObjectRecord(
                        aiSummary=(
                            "Die Besucherkarte unterstuetzt die Orientierung und sollte "
                            "aus dem rechten Kontextpanel verlinkt, nicht direkt in die "
                            "Stage eingebettet werden."
                        ),
                        disposition="Keep",
                        id="visitor-map",
                        roomId="intro-hall",
                        roomName="Intro Hall",
                        status="Approved",
                        title="Visitor Map",
                        type="Interpretive Graphic",
                    ),
                ],
                workflow=WorkflowSummary(
                    approvedCount=1,
                    pendingReviewCount=0,
                    reviewedCount=1,
                ),
            )
        ],
    ),
]


def build_project_summaries() -> list[ProjectSummary]:
    summaries: list[ProjectSummary] = []

    for project in PROJECT_RECORDS:
        summaries.append(
            ProjectSummary(
                id=project.id,
                title=project.name,
                description=project.summary,
                category=project.vertical.lower(),
                spaces=[
                    SpaceSummary(
                        id=space.id,
                        title=space.name,
                        matterportModelSid=space.matterport_model_sid,
                        mode=space.mode,
                        visibility="public" if space.matterport_model_sid else "private",
                        roomCount=len(space.rooms),
                        objectCount=len(space.objects),
                    )
                    for space in project.spaces
                ],
            )
        )

    return summaries


def build_review_queue() -> list[ReviewQueueItem]:
    items: list[ReviewQueueItem] = []

    for project in PROJECT_RECORDS:
        for space in project.spaces:
            room_lookup = {room.id: room for room in space.rooms}
            for object_record in space.objects:
                if object_record.status != "Needs Review":
                    continue
                room = room_lookup[object_record.room_id]
                items.append(
                    ReviewQueueItem(
                        disposition=object_record.disposition,
                        objectId=object_record.id,
                        objectTitle=object_record.title,
                        priorityBand=room.priority_band,
                        projectId=project.id,
                        projectName=project.name,
                        roomId=room.id,
                        roomName=room.name,
                        spaceId=space.id,
                        spaceName=space.name,
                        status=object_record.status,
                    )
                )

    return items
