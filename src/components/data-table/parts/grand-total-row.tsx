"use client"

import { computeSummary } from "./group-footer-row"
import type { ColumnDef } from "../types"

interface GrandTotalRowProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  label?: string
}

export function GrandTotalRow<T>({ data, columns, label }: GrandTotalRowProps<T>) {
  return (
    <tr>
      {columns.map((col, i) => (
        <td
          key={col.key}
          className={`py-2 px-4 text-sm font-semibold ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
        >
          {i === 0 ? (
            <span>{label ?? `Всего (${data.length})`}</span>
          ) : col.summary ? (
            col.summary.format === "money" ? (
              <span className="tabular-nums money">{computeSummary(col.summary, data)}</span>
            ) : (
              <span className="tabular-nums">{computeSummary(col.summary, data)}</span>
            )
          ) : null}
        </td>
      ))}
    </tr>
  )
}
