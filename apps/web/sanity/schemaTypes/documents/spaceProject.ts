import { ImagesIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const spaceProject = defineType({
  name: "spaceProject",
  title: "Space Project",
  type: "document",
  icon: ImagesIcon,
  fields: [
    defineField({
      name: "projectId",
      title: "Project ID",
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
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96
      },
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "vertical",
      title: "Vertical",
      type: "string",
      options: {
        list: [
          { title: "Estate", value: "estate" },
          { title: "Museum", value: "museum" },
          { title: "Collection", value: "collection" }
        ]
      },
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "Active" },
          { title: "Pilot", value: "Pilot" },
          { title: "Needs Review", value: "Needs Review" }
        ]
      },
      initialValue: "Pilot"
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 4
    })
  ],
  preview: {
    select: {
      subtitle: "vertical",
      title: "title"
    }
  }
})
