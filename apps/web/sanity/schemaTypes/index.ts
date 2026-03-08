import { aiProviderProfile } from "./documents/aiProviderProfile"
import { objectRecord } from "./documents/objectRecord"
import { roomRecord } from "./documents/roomRecord"
import { spaceProject } from "./documents/spaceProject"
import { spaceRecord } from "./documents/spaceRecord"
import { workflowAuditEvent } from "./documents/workflowAuditEvent"

export const schemaTypes = [
  spaceProject,
  spaceRecord,
  roomRecord,
  objectRecord,
  aiProviderProfile,
  workflowAuditEvent
]
