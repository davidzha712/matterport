# Matterport AI Platform Design

Date: 2026-03-07

## Validated direction

The direction is correct, with one important constraint: do not build this as "many models plugged into one chat box." The stable architecture is:

- Matterport as the spatial runtime
- structured object records as the business source of truth
- a model router behind the backend
- human approvals around high-risk workflow transitions
- IIIF-style detail viewing as a separate object-detail layer

This aligns with the product shape described by the user:

- full-screen immersive stage
- museum-grade object layer
- multimodal AI copilot
- workflow and export backend

## Product shell

Use a persistent application shell rather than disconnected pages.

Recommended route model:

- `/`
- `/spaces/[spaceId]`
- `/spaces/[spaceId]/explore`
- `/spaces/[spaceId]/work`
- `/spaces/[spaceId]/story`
- `/spaces/[spaceId]/review`
- `/spaces/[spaceId]/objects/[objectId]`
- `/spaces/[spaceId]/rooms/[roomId]`

Recommended screen structure:

- center: Matterport stage
- top-left: global search and AI command bar
- right: contextual side panel
- bottom: mode rail

Design guardrails:

- keep the stage visible on desktop while panels update
- use a bottom sheet for mobile context
- preserve visible spatial orientation with breadcrumbs and room chips
- mark AI-generated content and human-reviewed content distinctly

## Frontend boundaries

Build the UI around isolated integration seams:

- `ImmersiveShell`
- `MatterportStage`
- `SpatialOverlayLayer`
- `ContextPanel`
- `ObjectDetail`
- `IIIFViewer`
- `CopilotPanel`
- `ReviewQueuePanel`

State guidance:

- server state in TanStack Query
- local interaction state in Zustand
- URL as the source of truth for `space`, `room`, `object`, and `mode`

## Backend boundaries

Start with a modular monolith, not microservices.

Recommended modules:

- `api`
- `space`
- `catalog`
- `workflow`
- `ai_orchestrator`
- `export`
- `audit`

Technology direction:

- Next.js 15 frontend
- FastAPI backend
- PostgreSQL primary store
- Redis queue/cache
- S3-compatible object storage
- `pgvector` after MVP core flows are stable

## Data model priorities

Phase 1 entities:

- `Tenant`
- `User`
- `Project`
- `Space`
- `Room`
- `Anchor`
- `ObjectRecord`
- `DigitalAsset`
- `WorkflowItem`
- `Approval`
- `AuditEvent`

Key modeling rule:

- Mattertag is a spatial anchor only
- business object state lives in `ObjectRecord`

This prevents the product from collapsing into "tag title plus description" and preserves long-term portability.

## Model routing

Use a provider-agnostic routing layer with deterministic policies first.

Core pieces:

- `ModelCapabilityRegistry`
- `RoutingPolicyEngine`
- `ProviderAdapters`
- `FallbackChain`
- `Guardrails`
- `HumanGate`

Initial routing policy:

- visual detection tasks -> strongest vision-capable provider configured for the tenant
- narrative tasks -> strongest writing/summarization provider
- tool-driven workflow tasks -> provider with reliable structured output and tool use

Recommendation for MVP:

- implement router abstractions now
- activate only one provider first
- add the second provider after telemetry exists

## Security and audit

Non-negotiable controls:

- provider keys stored server-side only
- keys encrypted at rest
- tenant and project isolation enforced in every read/write path
- no arbitrary tenant-defined model endpoint URLs
- AI outputs treated as suggestions, never direct authority
- append-only audit for key actions, model calls, state changes, and exports

Required approval checkpoints:

- sell
- donate
- archive finalize
- export externally
- publish story/public view
- change provider keys or routing policy

## Delivery phases

### Phase 0

Repository bootstrap, planning docs, env contract, git discipline.

### Phase 1

Frontend shell plus Matterport stage integration.

Deliverables:

- full-screen shell
- URL-driven mode switching
- stage embedding
- right-side context panel placeholder

Verification:

- app boots locally
- keyboard navigation works
- no layout breakage on desktop/mobile

### Phase 2

Metadata and workflow baseline.

Deliverables:

- `Space`, `Room`, `ObjectRecord`, `WorkflowItem`
- review queue APIs
- room/object detail panels

Verification:

- CRUD tests
- audit events emitted
- status transitions enforced

### Phase 3

AI router v1.

Deliverables:

- provider registry
- one provider adapter live
- structured inference records
- approval-gated actions

Verification:

- schema validation
- retry/circuit-breaker behavior
- secrets never appear in logs

### Phase 4

IIIF-style detail viewer and export flows.

Deliverables:

- deep zoom viewer
- annotation-ready asset model
- export center

Verification:

- large image performance
- PDF/CSV export correctness
- access control on generated artifacts

## Verification standard

Every implementation phase should end with:

- git commit
- local type/lint/test run
- UI review against current web interface guidelines
- security regression review for any new secret/input/upload/API surface
- brief manual walkthrough note in commit or companion doc

## Pending external inputs

Implementation can proceed immediately after the user provides:

- Matterport SDK key
- at least one model SID
- API token ID and secret if backend sync is required
- OAuth client credentials only if private embeds are required
- one or two real workflow examples
