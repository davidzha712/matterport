from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthcheck_returns_ok() -> None:
    response = client.get("/api/v1/healthz")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "matterport-platform-api",
        "version": "0.1.0",
    }


def test_projects_list_returns_platform_projects() -> None:
    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    payload = response.json()
    assert {project["id"] for project in payload["items"]} == {
        "estate-orchard",
        "museum-lantern",
    }


def test_project_catalog_returns_nested_space_records() -> None:
    response = client.get("/api/v1/projects/catalog")

    assert response.status_code == 200
    payload = response.json()
    orchard = next(item for item in payload["items"] if item["id"] == "estate-orchard")
    assert orchard["spaces"][0]["id"] == "orchard-main-house"
    assert orchard["spaces"][0]["workflow"]["pendingReviewCount"] == 2


def test_project_spaces_are_scoped_to_project() -> None:
    response = client.get("/api/v1/projects/estate-orchard/spaces")

    assert response.status_code == 200
    payload = response.json()
    assert [space["id"] for space in payload["items"]] == ["orchard-main-house"]


def test_space_detail_exposes_rooms_objects_and_workflow() -> None:
    response = client.get("/api/v1/spaces/orchard-main-house")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "orchard-main-house"
    assert len(payload["rooms"]) == 2
    assert len(payload["objects"]) == 4
    assert payload["workflow"]["pendingReviewCount"] == 2


def test_space_room_and_object_endpoints_return_detail_records() -> None:
    room_response = client.get("/api/v1/spaces/orchard-main-house/rooms/living-room")
    object_response = client.get("/api/v1/spaces/orchard-main-house/objects/walnut-cabinet")

    assert room_response.status_code == 200
    assert room_response.json()["name"] == "Living Room"
    assert object_response.status_code == 200
    assert object_response.json()["title"] == "Walnut Cabinet"


def test_review_queue_lists_pending_objects_with_context() -> None:
    response = client.get("/api/v1/workflows/review-queue")

    assert response.status_code == 200
    payload = response.json()
    assert [item["objectId"] for item in payload["items"]] == [
        "walnut-cabinet",
        "atlas-desk",
    ]
    assert payload["items"][0]["spaceId"] == "orchard-main-house"


def test_object_workflow_patch_updates_state_and_adds_audit_event() -> None:
    response = client.patch(
        "/api/v1/spaces/orchard-main-house/objects/walnut-cabinet",
        json={
            "disposition": "Keep",
            "reviewer": "museum-ops",
            "note": "Familiengespraech hat Behalten bestaetigt.",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["objectRecord"]["disposition"] == "Keep"
    assert payload["objectRecord"]["status"] == "Reviewed"
    assert payload["workflow"]["pendingReviewCount"] == 1
    assert payload["auditEvent"]["reviewer"] == "museum-ops"
    assert payload["auditEvent"]["before"]["disposition"] == "Sell"
    assert payload["auditEvent"]["after"]["disposition"] == "Keep"

    queue_response = client.get("/api/v1/workflows/review-queue?spaceId=orchard-main-house")
    assert queue_response.status_code == 200
    assert [item["objectId"] for item in queue_response.json()["items"]] == ["atlas-desk"]

    audit_response = client.get("/api/v1/workflows/audit-log?spaceId=orchard-main-house")
    assert audit_response.status_code == 200
    assert audit_response.json()["items"][0]["objectId"] == "walnut-cabinet"


def test_unknown_project_returns_404() -> None:
    response = client.get("/api/v1/projects/missing-project/spaces")

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found"}


def test_provider_list_exposes_capabilities_without_secrets() -> None:
    response = client.get("/api/v1/providers")

    assert response.status_code == 200
    payload = response.json()
    provider = next(item for item in payload["items"] if item["id"] == "openai")
    assert provider["configured"] is False
    assert "taskClasses" in provider
    assert "apiKey" not in provider


def test_matterport_status_masks_secret_configuration() -> None:
    response = client.get("/api/v1/integrations/matterport/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "matterport"
    assert "tokenSecret" not in payload
    assert "sdkKey" not in payload
