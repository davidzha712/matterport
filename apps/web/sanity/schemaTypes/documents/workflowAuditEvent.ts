import { DocumentTextIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const workflowAuditEvent = defineType({
  name: "workflowAuditEvent",
  title: "Workflow Audit Event",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "eventId",
      title: "Event ID",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "space",
      title: "Space",
      type: "reference",
      to: [{ type: "spaceRecord" }],
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "room",
      title: "Room",
      type: "reference",
      to: [{ type: "roomRecord" }]
    }),
    defineField({
      name: "object",
      title: "Object",
      type: "reference",
      to: [{ type: "objectRecord" }],
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "reviewer",
      title: "Reviewer",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "note",
      title: "Note",
      type: "text",
      rows: 3
    }),
    defineField({
      name: "beforeDisposition",
      title: "Before Disposition",
      type: "string"
    }),
    defineField({
      name: "beforeStatus",
      title: "Before Status",
      type: "string"
    }),
    defineField({
      name: "afterDisposition",
      title: "After Disposition",
      type: "string"
    }),
    defineField({
      name: "afterStatus",
      title: "After Status",
      type: "string"
    }),
    defineField({
      name: "eventTimestamp",
      title: "Event Timestamp",
      type: "datetime",
      validation: (rule) => rule.required()
    })
  ],
  preview: {
    select: {
      reviewer: "reviewer",
      timestamp: "eventTimestamp",
      title: "eventId"
    },
    prepare(selection) {
      const { reviewer, timestamp, title } = selection
      return {
        subtitle: `${reviewer ?? "unknown"} · ${timestamp ?? ""}`,
        title
      }
    }
  }
})
