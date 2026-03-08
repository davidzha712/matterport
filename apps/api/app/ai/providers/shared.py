"""Shared constants and utilities for all AI provider adapters."""

from __future__ import annotations

import base64
import binascii
import ipaddress
import socket
from urllib.parse import urlparse

from app.ai.errors import TaskInputValidationError


SYSTEM_PROMPTS: dict[str, str] = {
    "narrative-summarize": (
        "You are a museum-grade interpretive writer for immersive estate and collection spaces. "
        "Respond in the same language as the user's prompt, stay factual, mark uncertainty "
        "explicitly, and keep the answer concise."
    ),
    "vision-detect": (
        "You are a multimodal collections analyst for an immersive estate and museum platform. "
        "Respond in the same language as the user's prompt. "
        "Identify the most salient objects, likely materials, visible condition clues, and any ambiguities. "
        "Do not estimate price, provenance certainty, or irreversible disposition. "
        "State clearly that human review is required before workflow changes. "
        "When identifying objects, list each detected item with: label, type, estimated confidence (0-1), "
        "and a brief description."
    ),
    "workflow-assist": (
        "You are a human-in-the-loop workflow planner for estate review and collection operations. "
        "Respond in the same language as the user's prompt. Produce a concise, sequenced plan that "
        "never bypasses human approval or publication review."
    ),
}

ALLOWED_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
MAX_IMAGE_BYTES = 8 * 1024 * 1024


def validate_data_image_url(image_source: str) -> None:
    header, separator, encoded_payload = image_source.partition(",")
    if not separator or ";base64" not in header:
        raise TaskInputValidationError("Uploaded images must be encoded as base64 data URLs.")

    media_type = header.split(":", 1)[1].split(";", 1)[0].lower()
    if media_type not in ALLOWED_IMAGE_TYPES:
        raise TaskInputValidationError("Only JPEG, PNG, and WebP images are supported.")

    try:
        image_bytes = base64.b64decode(encoded_payload, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise TaskInputValidationError("The uploaded image could not be decoded.") from exc

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise TaskInputValidationError("Uploaded images must be 8 MB or smaller.")


def validate_remote_image_url(image_source: str) -> None:
    parsed = urlparse(image_source)
    if parsed.scheme != "https" or not parsed.hostname:
        raise TaskInputValidationError(
            "Remote image attachments must use HTTPS URLs with a valid host."
        )

    hostname = parsed.hostname

    try:
        addresses = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise TaskInputValidationError(
            "The remote image host could not be resolved."
        ) from exc

    for _family, _, _, _, sockaddr in addresses:
        ip = ipaddress.ip_address(sockaddr[0])
        if any(
            (
                ip.is_private,
                ip.is_loopback,
                ip.is_link_local,
                ip.is_multicast,
                ip.is_reserved,
                ip.is_unspecified,
            )
        ):
            raise TaskInputValidationError(
                "Remote image attachments must resolve to public internet hosts."
            )


def normalize_image_source(image_source: str) -> tuple[str, str]:
    normalized = image_source.strip()

    if normalized.startswith("data:image/"):
        validate_data_image_url(normalized)
        return normalized, "inline-upload"

    if normalized.startswith("https://"):
        validate_remote_image_url(normalized)
        return normalized, "remote-url"

    raise TaskInputValidationError(
        "Image attachments must be uploaded images or secure HTTPS image URLs."
    )
