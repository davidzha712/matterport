from __future__ import annotations

from app.models import SpaceRecord, WorkflowReadiness


def build_workflow_readiness(space: SpaceRecord) -> WorkflowReadiness:
    total_objects = len(space.objects)
    approved_count = sum(1 for item in space.objects if item.status == "Approved")
    reviewed_count = sum(1 for item in space.objects if item.status == "Reviewed")
    pending_review_count = sum(1 for item in space.objects if item.status == "Needs Review")

    blockers: list[str] = []
    if total_objects == 0:
        blockers.append("no-objects")
    if pending_review_count > 0:
        blockers.append("pending-review")
    if approved_count == 0:
        blockers.append("no-approved")

    export_ready = total_objects > 0 and pending_review_count == 0
    publication_ready = export_ready and approved_count > 0

    return WorkflowReadiness(
        approvedCount=approved_count,
        blockers=blockers,
        exportReady=export_ready,
        listingReady=publication_ready,
        pendingReviewCount=pending_review_count,
        reviewedCount=reviewed_count,
        shareReady=publication_ready,
        storyReady=publication_ready,
        totalObjects=total_objects,
    )
