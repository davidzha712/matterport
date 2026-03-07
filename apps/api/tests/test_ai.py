from fastapi.testclient import TestClient

import app.settings as settings
from app.ai.providers.minimax import MiniMaxAdapter, ProviderInvocationError
from app.ai.schemas import AITaskOutput, AITaskRequest
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
    monkeypatch.setattr(
        MiniMaxAdapter,
        "_invoke_vision_task",
        lambda self, task: AITaskOutput(
            summary="MiniMax hat das uebermittelte Bild analysiert.",
            structuredData={
                "attachmentCount": 1,
                "deliveryMode": "native-vlm",
                "imageOrigin": "remote-url",
                "spaceId": task.input.space_id,
            },
            warnings=["Human review required."],
        ),
    )

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
    assert payload["output"]["structuredData"]["deliveryMode"] == "native-vlm"
    assert secret not in response.text


def test_ai_task_invokes_minimax_runtime_for_narrative_summarize(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    monkeypatch.setattr(settings, "_read_local_env", lambda: {"MINIMAX_API_KEY": "secret"})
    monkeypatch.setattr(
        MiniMaxAdapter,
        "_invoke_text_task",
        lambda self, task: "Kuratorische Zusammenfassung aus MiniMax.",
    )

    response = client.post(
        "/api/v1/ai/tasks",
        json={
            "taskType": "narrative-summarize",
            "input": {
                "prompt": "Schreibe eine hochwertige Zusammenfassung dieses Raums.",
                "spaceId": "museum-east-hall",
                "roomId": "library",
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"]["providerId"] == "minimax"
    assert payload["output"]["summary"] == "Kuratorische Zusammenfassung aus MiniMax."
    assert payload["output"]["structuredData"]["deliveryMode"] == "openai-compatible-text"
    assert payload["output"]["structuredData"]["model"] == "MiniMax-M1"


def test_ai_task_returns_502_when_minimax_invocation_fails(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    monkeypatch.setattr(settings, "_read_local_env", lambda: {"MINIMAX_API_KEY": "secret"})

    def raise_provider_error(self, task) -> str:
        raise ProviderInvocationError("MiniMax request failed.")

    monkeypatch.setattr(MiniMaxAdapter, "_invoke_text_task", raise_provider_error)

    response = client.post(
        "/api/v1/ai/tasks",
        json={
            "taskType": "workflow-assist",
            "input": {
                "prompt": "Erstelle einen sicheren Review-Ablauf fuer diesen Raum.",
                "spaceId": "museum-east-hall",
            },
        },
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "MiniMax request failed."}


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


def test_minimax_adapter_runs_inline_vision_uploads_without_text_fallback(monkeypatch) -> None:
    adapter = MiniMaxAdapter(api_key="secret-minimax-token")
    monkeypatch.setattr(
        MiniMaxAdapter,
        "_invoke_vision_task",
        lambda self, task: AITaskOutput(
            summary="Eine dunkle Holzkommode dominiert die Aufnahme.",
            structuredData={
                "attachmentCount": 1,
                "deliveryMode": "native-vlm",
                "imageOrigin": "inline-upload",
            },
            warnings=["Human review required."],
        ),
    )

    task = AITaskRequest.model_validate(
        {
            "taskType": "vision-detect",
            "input": {
                "prompt": "Analysiere dieses Objektbild.",
                "spaceId": "museum-east-hall",
                "attachments": [{"kind": "image", "url": "data:image/png;base64,ZmFrZQ=="}],
            },
        }
    )

    output = adapter.run(task)

    assert output.summary == "Eine dunkle Holzkommode dominiert die Aufnahme."
    assert output.structured_data["deliveryMode"] == "native-vlm"
    assert output.structured_data["imageOrigin"] == "inline-upload"


def test_ai_task_returns_422_when_vision_detect_has_no_image_attachment(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    monkeypatch.setattr(settings, "_read_local_env", lambda: {"MINIMAX_API_KEY": "secret"})

    response = client.post(
        "/api/v1/ai/tasks",
        json={
            "taskType": "vision-detect",
            "input": {
                "prompt": "Analysiere dieses Objekt.",
                "spaceId": "museum-east-hall",
            },
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Vision tasks require at least one image attachment as an upload or HTTPS image URL."
    }
