"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CellRenderer } from "../cells/cell-renderer"
import type { ColumnDef, TableContext } from "../types"

interface DataRowProps<T> {
  row: T
  rowKey: string
  columns: ColumnDef<T>[]
  ctx: TableContext
  onFieldChange: (rowKey: string, field: keyof T, value: number | null) => void
  loadingActions: Map<string, Set<string>>
  setActionLoading: (rowKey: string, actionKey: string, loading: boolean) => void
}

function DataRowInner<T>({
  row,
  rowKey,
  columns,
  ctx,
  onFieldChange,
  loadingActions,
  setActionLoading,
}: DataRowProps<T>) {
  return (
    <tr className="table-row">
      {columns.map(col => (
        <td
          key={col.key}
          className={cn(
            "table-cell",
            col.align === "right" && "text-right",
            col.align === "center" && "text-center"
          )}
        >
          <CellRenderer
            config={col.cell}
            row={row}
            rowKey={rowKey}
            ctx={ctx}
            onFieldChange={onFieldChange}
            loadingActions={loadingActions}
            setActionLoading={setActionLoading}
          />
        </td>
      ))}
    </tr>
  )
}

export const DataRow = React.memo(DataRowInner) as typeof DataRowInner
