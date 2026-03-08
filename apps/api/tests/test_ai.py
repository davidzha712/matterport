from fastapi.testclient import TestClient

import app.settings as settings
from app.ai.errors import ProviderInvocationError, TaskInputValidationError
from app.ai.providers.kimi import KimiAdapter
from app.ai.providers.minimax import MiniMaxAdapter
from app.ai.providers.openai import OpenAIAdapter
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


def test_ai_task_prefers_kimi_for_narrative_when_configured(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    monkeypatch.setattr(
        settings,
        "_read_local_env",
        lambda: {"KIMI_API_KEY": "secret-kimi-token", "OPENAI_API_KEY": "secret-openai-token"},
    )
    monkeypatch.setattr(
        KimiAdapter,
        "_invoke_text_task",
        lambda self, task: "Kimi narrative summary.",
    )

    response = client.post(
        "/api/v1/ai/tasks",
        json={
            "taskType": "narrative-summarize",
            "input": {
                "prompt": "Schreibe eine hochwertige Zusammenfassung dieses Raums.",
                "spaceId": "museum-east-hall",
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"]["providerId"] == "kimi"
    assert payload["output"]["summary"] == "Kimi narrative summary."


def test_ai_task_prefers_openai_for_workflow_when_multiple_providers_are_configured(monkeypatch) -> None:
    _clear_ai_provider_env(monkeypatch)
    monkeypatch.setattr(
        settings,
        "_read_local_env",
        lambda: {"OPENAI_API_KEY": "secret-openai-token", "MINIMAX_API_KEY": "secret-minimax-token"},
    )
    monkeypatch.setattr(
        OpenAIAdapter,
        "_invoke_text_task",
        lambda self, task: "OpenAI workflow plan.",
    )

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

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"]["providerId"] == "openai"
    assert payload["output"]["summary"] == "OpenAI workflow plan."


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


def test_openai_adapter_rejects_private_remote_image_hosts() -> None:
    adapter = OpenAIAdapter(api_key="secret-openai-token")
    task = AITaskRequest.model_validate(
        {
            "taskType": "vision-detect",
            "input": {
                "prompt": "Analysiere dieses Objektbild.",
                "attachments": [{"kind": "image", "url": "https://127.0.0.1/frame.jpg"}],
            },
        }
    )

    try:
        adapter.run(task)
    except TaskInputValidationError as exc:
        assert str(exc) == "Remote image attachments must resolve to public internet hosts."
    else:
        raise AssertionError("Expected TaskInputValidationError for private image host.")
