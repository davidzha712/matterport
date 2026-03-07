from __future__ import annotations

from app.ai.schemas import AITaskOutput, AITaskRequest


class MiniMaxAdapter:
    provider_id = "minimax"
    label = "MiniMax"
    supported_task_types = frozenset(
        {"vision-detect", "narrative-summarize", "workflow-assist"}
    )

    def __init__(self, api_key: str | None) -> None:
        self._api_key = api_key

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def supports(self, task_type: str) -> bool:
        return task_type in self.supported_task_types

    def run(self, task: AITaskRequest) -> AITaskOutput:
        prompt_preview = task.input.prompt.strip()[:160]
        attachment_count = len(task.input.attachments)

        if task.task_type == "vision-detect":
            structured_data = {
                "spaceId": task.input.space_id,
                "roomId": task.input.room_id,
                "attachmentCount": attachment_count,
                "candidateDetections": [
                    "primary furnishing cluster",
                    "decorative object group",
                    "surface-level labels requiring OCR review",
                ],
                "promptPreview": prompt_preview,
            }
            summary = "MiniMax vision routing skeleton produced a review-first detection draft."
        elif task.task_type == "narrative-summarize":
            structured_data = {
                "spaceId": task.input.space_id,
                "tone": "museum-grade interpretive",
                "sections": ["room context", "object highlights", "next research gaps"],
                "promptPreview": prompt_preview,
            }
            summary = "MiniMax narrative routing skeleton produced a structured storytelling draft."
        else:
            structured_data = {
                "spaceId": task.input.space_id,
                "workflowSteps": [
                    "collect object evidence",
                    "route to human review",
                    "prepare export packet",
                ],
                "promptPreview": prompt_preview,
            }
            summary = "MiniMax workflow routing skeleton produced a human-in-the-loop action plan."

        return AITaskOutput(
            summary=summary,
            structuredData=structured_data,
            warnings=[
                "Provider adapter is in skeleton mode; external inference is not invoked yet.",
                "Human confirmation is required before any object status or publication change.",
            ],
        )
