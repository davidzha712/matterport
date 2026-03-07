from __future__ import annotations

from app.models import ProjectSummary, ProviderSummary, SpaceSummary


PROJECTS: list[ProjectSummary] = [
    ProjectSummary(
        id="estate-archive",
        title="Estate Archive",
        description="Family estate review workspace with object triage and listing prep.",
        category="estate",
        spaces=[
            SpaceSummary(
                id="estate-library",
                title="North Wing Library",
                matterportModelSid="aBc123Estate",
                mode="estate",
                visibility="private",
                roomCount=6,
                objectCount=48,
            ),
            SpaceSummary(
                id="estate-gallery",
                title="Parlor and Portrait Gallery",
                matterportModelSid="dEf456Estate",
                mode="inventory",
                visibility="private",
                roomCount=4,
                objectCount=31,
            ),
        ],
    ),
    ProjectSummary(
        id="museum-pilot",
        title="Museum Pilot",
        description="Curated storytelling environment with room narratives and object detail views.",
        category="museum",
        spaces=[
            SpaceSummary(
                id="museum-east-hall",
                title="East Hall Exhibition",
                matterportModelSid="gHi789Museum",
                mode="museum",
                visibility="public",
                roomCount=8,
                objectCount=72,
            )
        ],
    ),
]

PROVIDERS: list[ProviderSummary] = [
    ProviderSummary(
        id="openai",
        label="OpenAI",
        configured=False,
        multimodal=True,
        taskClasses=["workflow-agent", "narrative", "vision"],
        preferredFor=["complex reasoning", "tool use", "multimodal coordination"],
    ),
    ProviderSummary(
        id="qwen",
        label="Qwen",
        configured=False,
        multimodal=True,
        taskClasses=["vision", "document"],
        preferredFor=["cost control", "self-hosted deployments", "document parsing"],
    ),
    ProviderSummary(
        id="kimi",
        label="Kimi",
        configured=False,
        multimodal=True,
        taskClasses=["long-context", "workflow-agent"],
        preferredFor=["long context analysis", "research flows", "agent-heavy tasks"],
    ),
    ProviderSummary(
        id="minimax",
        label="MiniMax",
        configured=False,
        multimodal=True,
        taskClasses=["speech", "vision", "video"],
        preferredFor=["speech pipelines", "media-rich workflows", "China-region deployments"],
    ),
]

