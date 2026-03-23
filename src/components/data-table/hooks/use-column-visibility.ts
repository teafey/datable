"use client"

import * as React from "react"
import type { ColumnDef, TableContext } from "../types"

export function useColumnVisibility<T>(columns: ColumnDef<T>[], ctx: TableContext): ColumnDef<T>[] {
  return React.useMemo(() => {
    return columns.filter(col => {
      if (col.visible === undefined) return true
      if (typeof col.visible === "boolean") return col.visible
      return col.visible(ctx)
    })
  }, [columns, ctx])
}
