from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from app.ai.providers import MiniMaxAdapter, OpenAIAdapter, QwenAdapter, KimiAdapter
from app.ai.providers.base import ProviderAdapter
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

ROUTING_POLICY: dict[str, tuple[str, ...]] = {
    "vision-detect": ("minimax", "openai", "qwen", "kimi"),
    "narrative-summarize": ("kimi", "openai", "minimax", "qwen"),
    "workflow-assist": ("openai", "kimi", "minimax"),
}


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


def build_routing_adapters(
    settings: AIProviderSettings | None = None,
) -> list[ProviderAdapter]:
    resolved_settings = settings or get_ai_provider_settings()
    return [
        OpenAIAdapter(
            api_key=resolved_settings.openai_api_key,
            base_url=resolved_settings.openai_api_base_url,
            text_model=resolved_settings.openai_text_model,
            vision_model=resolved_settings.openai_vision_model,
            timeout_seconds=resolved_settings.openai_timeout_seconds,
        ),
        MiniMaxAdapter(
            api_key=resolved_settings.minimax_api_key,
            api_host=resolved_settings.minimax_api_host,
            api_base_url=resolved_settings.minimax_api_base_url,
            text_model=resolved_settings.minimax_text_model,
            timeout_seconds=resolved_settings.minimax_timeout_seconds,
            vision_timeout_seconds=resolved_settings.minimax_vision_timeout_seconds,
        ),
        QwenAdapter(
            api_key=resolved_settings.qwen_api_key,
            base_url=resolved_settings.qwen_api_base_url,
            text_model=resolved_settings.qwen_text_model,
            vision_model=resolved_settings.qwen_vision_model,
            timeout_seconds=resolved_settings.qwen_timeout_seconds,
        ),
        KimiAdapter(
            api_key=resolved_settings.kimi_api_key,
            base_url=resolved_settings.kimi_api_base_url,
            text_model=resolved_settings.kimi_text_model,
            vision_model=resolved_settings.kimi_vision_model,
            timeout_seconds=resolved_settings.kimi_timeout_seconds,
        ),
    ]


def get_task_routing_order(task_type: str) -> Sequence[str]:
    return ROUTING_POLICY.get(task_type, tuple())
