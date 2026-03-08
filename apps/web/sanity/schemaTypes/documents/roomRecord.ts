import { DocumentsIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const roomRecord = defineType({
  name: "roomRecord",
  title: "Room",
  type: "document",
  icon: DocumentsIcon,
  fields: [
    defineField({
      name: "roomId",
      title: "Room ID",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "title",
      title: "Title",
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
      name: "priorityBand",
      title: "Priority Band",
      type: "string",
      options: {
        list: [
          { title: "High", value: "High" },
          { title: "Medium", value: "Medium" },
          { title: "Low", value: "Low" }
        ]
      },
      initialValue: "Medium"
    }),
    defineField({
      name: "recommendation",
      title: "Recommendation",
      type: "text",
      rows: 3
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 4
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      initialValue: 100
    })
  ],
  preview: {
    select: {
      subtitle: "priorityBand",
      title: "title"
    }
  }
})
