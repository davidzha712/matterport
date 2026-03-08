import { CogIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const aiProviderProfile = defineType({
  name: "aiProviderProfile",
  title: "AI Provider Profile",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "providerId",
      title: "Provider ID",
      type: "string",
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
      name: "preferredFor",
      title: "Preferred For",
      type: "array",
      of: [{ type: "string" }]
    }),
    defineField({
      name: "configured",
      title: "Configured",
      type: "boolean",
      initialValue: false
    }),
    defineField({
      name: "specialty",
      title: "Specialty",
      type: "string"
    }),
    defineField({
      name: "fallbackClass",
      title: "Fallback Class",
      type: "string"
    }),
    defineField({
      name: "notes",
      title: "Ops Notes",
      type: "text",
      rows: 4
    })
  ],
  preview: {
    select: {
      subtitle: "status",
      title: "title"
    }
  }
})
