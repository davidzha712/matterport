export function toToneToken(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-")
}

const workflowStatusLabels: Record<string, string> = {
  Active: "Aktiv",
  "Needs Review": "Pruefung noetig",
  Pilot: "Pilot"
}

const objectStatusLabels: Record<string, string> = {
  Approved: "Freigegeben",
  "Needs Review": "Pruefung noetig",
  Reviewed: "Geprueft"
}

const dispositionLabels: Record<string, string> = {
  Archive: "Archivieren",
  Donate: "Spenden",
  Keep: "Behalten",
  Sell: "Verkaufen"
}

const verticalLabels: Record<string, string> = {
  Collection: "Sammlung",
  Estate: "Nachlass",
  Museum: "Museum"
}

export function toDisplayWorkflowStatus(value: string) {
  return workflowStatusLabels[value] ?? value
}

export function toDisplayObjectStatus(value: string) {
  return objectStatusLabels[value] ?? value
}

export function toDisplayDisposition(value: string) {
  return dispositionLabels[value] ?? value
}

export function toDisplayVertical(value: string) {
  return verticalLabels[value] ?? value
}
