"use client"

import { formatMoney } from "@/lib/utils"
import type { ColumnDef, SummaryConfig } from "../types"

export function computeSummary<T>(config: SummaryConfig<T>, items: T[]): string {
  let value: number | string | null = null

  switch (config.aggregate) {
    case "sum":
      if (config.field) {
        value = items.reduce((sum, row) => sum + (config.field!(row) ?? 0), 0)
      }
      break
    case "avg":
      if (config.field) {
        const vals = items.map(row => config.field!(row)).filter((v): v is number => v !== null)
        value = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }
      break
    case "count":
      value = items.length
      break
    case "median":
      if (config.field) {
        const vals = items.map(row => config.field!(row)).filter((v): v is number => v !== null)
        if (vals.length === 0) {
          value = null
        } else {
          vals.sort((a, b) => a - b)
          const mid = Math.floor(vals.length / 2)
          value = vals.length % 2 === 0
            ? (vals[mid - 1] + vals[mid]) / 2
            : vals[mid]
        }
      }
      break
    case "min":
      if (config.field) {
        const vals = items.map(row => config.field!(row)).filter((v): v is number => v !== null)
        value = vals.length > 0 ? Math.min(...vals) : null
      }
      break
    case "max":
      if (config.field) {
        const vals = items.map(row => config.field!(row)).filter((v): v is number => v !== null)
        value = vals.length > 0 ? Math.max(...vals) : null
      }
      break
    case "custom":
      value = config.custom?.(items) ?? null
      break
  }

  if (value === null) return ""
  if (typeof value === "string") return value

  switch (config.format) {
    case "money":
      return formatMoney(value)
    case "percent":
      return `${Math.round(value)}%`
    case "number":
      return String(value)
    default:
      return String(value)
  }
}

interface GroupFooterRowProps<T> {
  items: T[]
  columns: ColumnDef<T>[]
  label?: string
}

export function GroupFooterRow<T>({ items, columns, label }: GroupFooterRowProps<T>) {
  return (
    <tr className="border-t border-border-subtle bg-bg-base">
      {columns.map((col, i) => (
        <td
          key={col.key}
          className={`py-2 px-4 text-xs font-medium text-text-secondary ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
        >
          {i === 0 ? (
            <span className="font-medium">{label ?? "Итого"}</span>
          ) : col.summary ? (
            col.summary.format === "money" ? (
              <span className="tabular-nums money">{computeSummary(col.summary, items)}</span>
            ) : (
              <span className="tabular-nums">{computeSummary(col.summary, items)}</span>
            )
          ) : null}
        </td>
      ))}
    </tr>
  )
}
