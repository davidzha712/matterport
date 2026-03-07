from __future__ import annotations

from dataclasses import dataclass

from app.ai.providers import MiniMaxAdapter
from app.models import ProviderSummary
from app.settings import AIProviderSettings, get_ai_provider_settings


@dataclass(frozen=True)
class ProviderDefinition:
    id: str
    label: str
    multimodal: bool
    task_classes: tuple[str, ...]
    preferred_for: tuple[str, ...]
    env_field: str


PROVIDER_DEFINITIONS: tuple[ProviderDefinition, ...] = (
    ProviderDefinition(
        id="openai",
        label="OpenAI",
        multimodal=True,
        task_classes=("workflow-agent", "narrative", "vision"),
        preferred_for=("complex reasoning", "tool use", "multimodal coordination"),
        env_field="openai_api_key",
    ),
    ProviderDefinition(
        id="qwen",
        label="Qwen",
        multimodal=True,
        task_classes=("vision", "document"),
        preferred_for=("cost control", "self-hosted deployments", "document parsing"),
        env_field="qwen_api_key",
    ),
    ProviderDefinition(
        id="kimi",
        label="Kimi",
        multimodal=True,
        task_classes=("long-context", "workflow-agent"),
        preferred_for=("long context analysis", "research flows", "agent-heavy tasks"),
        env_field="kimi_api_key",
    ),
    ProviderDefinition(
        id="minimax",
        label="MiniMax",
        multimodal=True,
        task_classes=("vision", "speech", "video", "narrative", "workflow-agent"),
        preferred_for=("speech pipelines", "media-rich workflows", "China-region deployments"),
        env_field="minimax_api_key",
    ),
)


def _is_provider_configured(definition: ProviderDefinition, settings: AIProviderSettings) -> bool:
    return bool(getattr(settings, definition.env_field))


def build_provider_summaries(
    settings: AIProviderSettings | None = None,
) -> list[ProviderSummary]:
    resolved_settings = settings or get_ai_provider_settings()
    return [
        ProviderSummary(
            id=definition.id,
            label=definition.label,
            configured=_is_provider_configured(definition, resolved_settings),
            multimodal=definition.multimodal,
            taskClasses=list(definition.task_classes),
            preferredFor=list(definition.preferred_for),
        )
        for definition in PROVIDER_DEFINITIONS
    ]


def build_routing_adapters(settings: AIProviderSettings | None = None) -> list[MiniMaxAdapter]:
    resolved_settings = settings or get_ai_provider_settings()
    return [MiniMaxAdapter(api_key=resolved_settings.minimax_api_key)]
