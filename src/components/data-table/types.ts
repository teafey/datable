import type React from "react"
import type { DepartmentHierarchyInfo } from "@/lib/api/departments"

// === TableContext ===
export interface TableContext<TExtra = {}> {
  permissions: string[]
  hasPermission: (p: string) => boolean
  role: string
  currentUserId: string
  mode?: string
  extra: TExtra
}

// === Cell Configs ===
export interface TextCellConfig<T> {
  type: "text"
  value: (row: T) => string | null
  subtitle?: (row: T) => string | null | undefined
  onClick?: (row: T) => void
}

export interface MoneyCellConfig<T> {
  type: "money"
  value: (row: T) => number | null
  colorClass?: string
}

export interface PercentCellConfig<T> {
  type: "percent"
  numerator: (row: T) => number | null
  denominator: (row: T) => number | null
  fallback?: (row: T) => string | undefined
  thresholds?: { value: number; class: string }[]
}

export interface EditableCellConfig<T> {
  type: "editable"
  value: (row: T) => number | null
  field: keyof T
  suffix?: string
  colorClass?: string
  disabled?: (row: T, ctx: TableContext) => boolean
}

export interface StatusCellConfig<T> {
  type: "status"
  value: (row: T) => string
  labels: Record<string, { label: string; class: string }>
}

export interface ActionItem<T> {
  key: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: (row: T) => void | Promise<void>
  visible?: (row: T, ctx: TableContext) => boolean
  disabled?: (row: T, ctx: TableContext) => boolean
  variant?: "default" | "danger" | "success"
}

export interface ActionsCellConfig<T> {
  type: "actions"
  items: ActionItem<T>[]
}

export interface CustomCellConfig<T> {
  type: "custom"
  render: (row: T, ctx: TableContext) => React.ReactNode
}

export interface BooleanCellConfig<T> {
  type: "boolean"
  value: (row: T) => boolean | null
  onChange?: (row: T) => void | Promise<void>
}

export type CellConfig<T> =
  | TextCellConfig<T>
  | MoneyCellConfig<T>
  | PercentCellConfig<T>
  | EditableCellConfig<T>
  | StatusCellConfig<T>
  | ActionsCellConfig<T>
  | CustomCellConfig<T>
  | BooleanCellConfig<T>

// === Summary ===
export interface SummaryConfig<T> {
  aggregate: "sum" | "avg" | "count" | "median" | "min" | "max" | "custom"
  field?: (row: T) => number | null
  custom?: (items: T[]) => number | string | null
  format?: "money" | "percent" | "number" | "text"
}

// === ColumnDef ===
export interface ColumnDef<T> {
  key: string
  label: string
  width?: string
  minWidth?: string
  align?: "left" | "right" | "center"
  sortable?: boolean
  sortValue?: (row: T) => string | number | null
  visible?: boolean | ((ctx: TableContext) => boolean)
  summary?: SummaryConfig<T>
  cell: CellConfig<T>
  hideable?: boolean
}

// === ComputedField ===
export interface ComputedField<T> {
  field: keyof T
  dependencies: (keyof T)[]
  compute: (row: T) => unknown
}

// === GroupingConfig ===
export interface GroupAction<T> {
  key: string
  label: (items: T[]) => string
  onClick: (items: T[], departmentId: string) => void | Promise<void>
  visible?: (items: T[], ctx: TableContext) => boolean
  disabled?: (items: T[], ctx: TableContext) => boolean
  variant?: "primary" | "secondary" | "danger"
}

export interface GroupingConfig<T> {
  enabled: boolean
  mode?: "hierarchy" | "flat"

  // Single-field grouping (legacy, for backward compatibility)
  getDepartmentId: (row: T) => string | null
  hierarchy: DepartmentHierarchyInfo[]

  // Multi-field grouping (new)
  fields?: string[]
  getGroupKey?: (row: T, level: number) => string | null
  getGroupLabel?: (groupKey: string | null, level: number, firstRowInGroup?: T) => string | null

  defaultCollapsed?: boolean
  headerSummary?: (directItems: T[], allDescendants: T[]) => React.ReactNode
  actions?: GroupAction<T>[]
}

// === DataTable Props ===
export interface DataTableProps<T, TExtra = {}> {
  initialData: T[]
  getRowKey: (row: T) => string
  columns: ColumnDef<T>[]
  computedFields?: ComputedField<T>[]
  context: TableContext<TExtra>
  grouping?: GroupingConfig<T>
  totals?: {
    groupTotals?: boolean
    tableTotals?: boolean
    label?: string
    groupLabel?: string
  }
  footer?: {
    left?: (data: T[], ctx: TableContext<TExtra>) => React.ReactNode
    right?: (data: T[], ctx: TableContext<TExtra>) => React.ReactNode
  }
  onSave?: (row: T, changedFields: (keyof T)[]) => Promise<void>
  saveDebounce?: number
  emptyMessage?: string
  settings?: string | boolean
}
