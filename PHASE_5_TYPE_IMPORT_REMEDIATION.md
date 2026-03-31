# Phase 5: Type Import Remediation Plan

## Overview
Three component files incorrectly import type definitions from `@/lib/mock-data` instead of from `@/lib/platform-types`, the authoritative type definition location. This remediation plan documents all required changes to establish consistent architectural imports across the codebase.

## Critical Issue
The three-layer data architecture (platform-service.ts → mappers.ts → runtime types) requires that ALL components import type definitions from the single authoritative source: `@/lib/platform-types`. Importing from `mock-data.ts` represents a backward dependency that violates architectural boundaries.

---

## File 1: interaction-dialog.tsx

**Current Location**: `/Users/yu/Workspace/matterport/apps/web/src/components/interaction-dialog.tsx`

**Current Import (Line 8)**:
```typescript
import type { ObjectRecord, RoomRecord, SpaceRecord } from "@/lib/mock-data"
```

**Corrected Import**:
```typescript
import type { ObjectRecord, RoomRecord, SpaceRecord } from "@/lib/platform-types"
```

**Rationale**:
- `interaction-dialog.tsx` is a display component that receives data from parent components via props
- Types should be imported from the authoritative definition location (`platform-types.ts`)
- `mock-data.ts` is a runtime polyfill that provides both type exports AND mock implementations
- Components should import types from `platform-types`, not from the mock data provider

**Impact Assessment**:
- Component receives `ObjectRecord[]`, `RoomRecord`, and `SpaceRecord` props
- No functional impact on component behavior (types are identical)
- Fixes architectural consistency violation

**Types Used in Component**:
- `ObjectRecord` - object data structure passed via `objects` prop (line 11)
- `RoomRecord` - room data structure passed via `room` prop (line 16)
- `SpaceRecord` - space data structure passed via `space` prop (line 17)
- `UserRole` - already imported from `@/lib/use-immersive-mode` (line 7) ✓

---

## File 2: matterport-stage.tsx

**Current Location**: `/Users/yu/Workspace/matterport/apps/web/src/components/matterport-stage.tsx`

**Current Import (Line 16)**:
```typescript
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/mock-data"
```

**Corrected Import**:
```typescript
import type { ObjectRecord, ProviderProfile, RoomRecord, SpaceRecord } from "@/lib/platform-types"
```

**Rationale**:
- `matterport-stage.tsx` is the root stage wrapper component that receives data structure types via props
- This is a high-impact file that directly affects multiple child components
- All four imported types should come from the authoritative source

**Impact Assessment**:
- Component receives all four types as props
- No functional impact on component behavior (types are identical)
- This file's import error has cascading architectural implications since it's a parent component
- Child components (`interaction-dialog.tsx`, `command-bar.tsx`, `context-panel.tsx`) also receive these same types

**Types Used in Component**:
- `ObjectRecord` - passed to child components (line 23 type annotation, line 92 props)
- `ProviderProfile` - passed to child components (line 22 type annotation)
- `RoomRecord` - passed to child components (line 24 type annotation)
- `SpaceRecord` - passed to child components (line 25 type annotation)

---

## File 3: object-workflow-card.tsx

**Current Location**: `/Users/yu/Workspace/matterport/apps/web/src/components/object-workflow-card.tsx`

**Current Import (Line 7)**:
```typescript
import type { ObjectRecord } from "@/lib/mock-data"
```

**Corrected Import**:
```typescript
import type { ObjectRecord } from "@/lib/platform-types"
```

**Rationale**:
- `object-workflow-card.tsx` is a display component that receives `ObjectRecord` data via props
- Single type import should come from the authoritative definition location
- `mock-data.ts` is a runtime polyfill, not a type definition module

**Impact Assessment**:
- Component receives `ObjectRecord` via `objectRecord` prop
- No functional impact on component behavior (type is identical)
- Fixes architectural consistency violation

**Types Used in Component**:
- `ObjectRecord` - display and workflow state for single object (prop at line ~12)

---

## Implementation Checklist

### Step 1: Update Imports (All files)
- [ ] **interaction-dialog.tsx** line 8: Change import source from `@/lib/mock-data` to `@/lib/platform-types`
- [ ] **matterport-stage.tsx** line 16: Change import source from `@/lib/mock-data` to `@/lib/platform-types`
- [ ] **object-workflow-card.tsx** line 7: Change import source from `@/lib/mock-data` to `@/lib/platform-types`

### Step 2: Verification
- [ ] Run TypeScript type check: `tsc --noEmit` to verify no type errors
- [ ] Verify component functionality is unchanged (types are identical, only source location changes)
- [ ] Review parent-child component type flow to confirm consistency

### Step 3: Related Files Check
After updating these three files, verify these components also have correct imports:
- `immersive-shell.tsx` - Uses `ObjectRecord`, `RoomRecord`, `SpaceRecord` types
- `command-bar.tsx` - Uses `RoomRecord`, `SpaceRecord` types
- `context-panel.tsx` - Uses `ObjectRecord`, `RoomRecord`, `SpaceRecord` types

---

## Architectural Context

### Three-Layer Data Architecture
1. **Authoritative Source Layer** (`platform-types.ts`): Type definitions
2. **Transformation Layer** (`sanity/mappers.ts`): Data transformation (✓ correctly imports from platform-types)
3. **Service Layer** (`platform-service.ts`): Queries Sanity CMS or returns mock data
4. **Component Layer**: Receives data via props and should import types from authoritative source

### Why This Matters
- `mock-data.ts` is a **runtime polyfill** that provides both type exports AND mock implementations
- It's intended as a temporary fallback when Sanity CMS is not configured
- Components should depend on type definitions (`platform-types.ts`), not on the mock data provider
- This maintains loose coupling and allows replacing mock data with real data without component changes

---

## Expected Outcome
After completing this remediation:
- All three files import types from `@/lib/platform-types` (consistent with `sanity/mappers.ts`)
- Component functionality is unchanged (types are identical)
- Architectural boundaries are respected
- Foundation is established for proceeding with Phase 6 (Hardcoded Content Catalog)
