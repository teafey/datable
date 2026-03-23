"use client"

import type { CellConfig, TableContext } from "../types"
import { TextCell } from "./text-cell"
import { MoneyCell } from "./money-cell"
import { PercentCell } from "./percent-cell"
import { EditableCellWrapper } from "./editable-cell"
import { StatusCell } from "./status-cell"
import { ActionsCell } from "./actions-cell"
import { CustomCell } from "./custom-cell"
import { BooleanCell } from "./boolean-cell"

interface CellRendererProps<T> {
  config: CellConfig<T>
  row: T
  rowKey: string
  ctx: TableContext
  onFieldChange: (rowKey: string, field: keyof T, value: number | null) => void
  loadingActions: Map<string, Set<string>>
  setActionLoading: (
    rowKey: string,
    actionKey: string,
    loading: boolean
  ) => void
}

export function CellRenderer<T>({
  config,
  row,
  rowKey,
  ctx,
  onFieldChange,
  loadingActions,
  setActionLoading,
}: CellRendererProps<T>) {
  switch (config.type) {
    case "text":
      return <TextCell config={config} row={row} />
    case "money":
      return <MoneyCell config={config} row={row} />
    case "percent":
      return <PercentCell config={config} row={row} />
    case "editable":
      return (
        <EditableCellWrapper
          config={config}
          row={row}
          rowKey={rowKey}
          ctx={ctx}
          onFieldChange={onFieldChange}
        />
      )
    case "status":
      return <StatusCell config={config} row={row} />
    case "actions":
      return (
        <ActionsCell
          config={config}
          row={row}
          rowKey={rowKey}
          ctx={ctx}
          loadingActions={loadingActions}
          setActionLoading={setActionLoading}
        />
      )
    case "custom":
      return <CustomCell config={config} row={row} ctx={ctx} />
    case "boolean":
      return <BooleanCell config={config} row={row} />
    default:
      return null
  }
}
