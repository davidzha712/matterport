import { HomeIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const spaceRecord = defineType({
  name: "spaceRecord",
  title: "Space",
  type: "document",
  icon: HomeIcon,
  fields: [
    defineField({
      name: "spaceId",
      title: "Space ID",
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
      name: "project",
      title: "Project",
      type: "reference",
      to: [{ type: "spaceProject" }],
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "matterportModelSid",
      title: "Matterport Model SID",
      type: "string"
    }),
    defineField({
      name: "mode",
      title: "Mode",
      type: "string",
      options: {
        list: [
          { title: "Estate", value: "estate" },
          { title: "Museum", value: "museum" },
          { title: "Inventory", value: "inventory" },
          { title: "Story", value: "story" }
        ]
      },
      initialValue: "estate"
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
      subtitle: "matterportModelSid",
      title: "title"
    }
  }
})
