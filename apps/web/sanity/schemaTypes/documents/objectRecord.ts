import { TagIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const objectRecord = defineType({
  name: "objectRecord",
  title: "Object Record",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "objectId",
      title: "Object ID",
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
      name: "room",
      title: "Room",
      type: "reference",
      to: [{ type: "roomRecord" }]
    }),
    defineField({
      name: "objectType",
      title: "Object Type",
      type: "string"
    }),
    defineField({
      name: "status",
      title: "Workflow Status",
      type: "string",
      options: {
        list: [
          { title: "Needs Review", value: "Needs Review" },
          { title: "Reviewed", value: "Reviewed" },
          { title: "Approved", value: "Approved" }
        ]
      },
      initialValue: "Needs Review"
    }),
    defineField({
      name: "disposition",
      title: "Disposition",
      type: "string",
      options: {
        list: [
          { title: "Keep", value: "Keep" },
          { title: "Sell", value: "Sell" },
          { title: "Donate", value: "Donate" },
          { title: "Archive", value: "Archive" }
        ]
      },
      initialValue: "Keep"
    }),
    defineField({
      name: "aiSummary",
      title: "AI Summary",
      type: "text",
      rows: 6
    }),
    defineField({
      name: "operatorNote",
      title: "Operator Note",
      type: "text",
      rows: 3
    }),
    defineField({
      name: "anchorPosition",
      title: "Anchor Position",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "number" }),
        defineField({ name: "y", title: "Y", type: "number" }),
        defineField({ name: "z", title: "Z", type: "number" })
      ]
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
      subtitle: "status",
      title: "title"
    }
  }
})
