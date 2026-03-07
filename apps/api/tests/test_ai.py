from fastapi.testclient import TestClient

import app.settings as settings
from app.main import app

client = TestClient(app)


def _clear_ai_provider_env(monkeypatch) -> None:
    for key in ("OPENAI_API_KEY", "QWEN_API_KEY", "KIMI_API_KEY", "MINIMAX_API_KEY"):
        monkeypatch.delenv(key, raising=False)


def test_provider_list_reads_minimax_configured_state_from_local_env(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    secret = "secret-minimax-token"
    monkeypatch.setattr(settings, "_read_local_env", lambda: {"MINIMAX_API_KEY": secret})

    response = client.get("/api/v1/providers")

    assert response.status_code == 200
    payload = response.json()
    minimax = next(item for item in payload["items"] if item["id"] == "minimax")
    assert minimax["configured"] is True
    assert secret not in response.text


def test_ai_task_routes_vision_detect_to_minimax_without_leaking_secret(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    secret = "secret-minimax-token"
    monkeypatch.setattr(settings, "_read_local_env", lambda: {"MINIMAX_API_KEY": secret})

    response = client.post(
        "/api/v1/ai/tasks",
        json={
            "taskType": "vision-detect",
            "input": {
                "prompt": "Identify the most important objects in this room.",
                "spaceId": "museum-east-hall",
                "attachments": [
                    {
                        "kind": "image",
                        "url": "https://example.com/frame.jpg",
                        "label": "Matterport capture",
                    }
                ],
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["taskType"] == "vision-detect"
    assert payload["provider"]["providerId"] == "minimax"
    assert payload["provider"]["configured"] is True
    assert payload["output"]["structuredData"]["attachmentCount"] == 1
    assert payload["output"]["structuredData"]["spaceId"] == "museum-east-hall"
    assert secret not in response.text


def test_ai_task_returns_503_when_no_configured_provider_can_handle_request(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    monkeypatch.setattr(settings, "_read_local_env", lambda: {})

    response = client.post(
        "/api/v1/ai/tasks",
        json={
            "taskType": "vision-detect",
            "input": {"prompt": "Find notable objects."},
        },
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "No configured AI provider is available for task type 'vision-detect'."
    }
