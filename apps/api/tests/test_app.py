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


def test_projects_list_returns_multiple_projects() -> None:
    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) >= 2
    assert {project["id"] for project in payload["items"]} == {
        "estate-archive",
        "museum-pilot",
    }


def test_project_spaces_are_scoped_to_project() -> None:
    response = client.get("/api/v1/projects/estate-archive/spaces")

    assert response.status_code == 200
    payload = response.json()
    assert [space["id"] for space in payload["items"]] == [
        "estate-library",
        "estate-gallery",
    ]


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
