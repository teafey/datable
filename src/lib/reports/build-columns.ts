import type { ColumnDef, CellConfig, TableContext, ComputedField } from "@/components/data-table/types"
import type {
  SerializableColumnConfig,
  SerializableCellConfig,
  LockRule,
  ActionDef,
  ComputedColumnConfig,
  ReportConfigV2,
} from "./types"
import type { PluginContext } from "./plugin-registry"
import { isFieldLocked } from "./lock-engine"
import { evaluateConditions, getDefaultActions } from "./action-engine"
import { compileFormula } from "./formula-engine"
import type React from "react"
import {
  Check,
  CheckCheck,
  X,
  Send,
  RefreshCw,
  Edit,
  Eye,
  Ban,
  CircleAlert,
  ArrowRight,
  Copy,
  Trash2,
} from "lucide-react"

export interface PluginRegistry {
  getPlugin: (
    key: string
  ) => ((row: Record<string, unknown>, ctx: TableContext & { extra?: PluginContext }) => React.ReactNode) | undefined
}

type Row = Record<string, unknown>

// === V2 Build Options ===

export interface BuildColumnsOptions {
  pluginRegistry?: PluginRegistry
  editing?: ReportConfigV2["editing"]
  lockRules?: LockRule[]
  actions?: ActionDef[]
  enableDefaultActions?: boolean
  role?: string
  permissions?: string[]
  fieldEditableByRoles?: Record<string, string[]>
  fieldLockRules?: Record<string, LockRule[]>
  onAction?: (action: ActionDef, row: Row) => void
}

// === Icon Map ===

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  check: Check,
  "check-check": CheckCheck,
  x: X,
  send: Send,
  "refresh-cw": RefreshCw,
  edit: Edit,
  eye: Eye,
  ban: Ban,
  "circle-alert": CircleAlert,
  "arrow-right": ArrowRight,
  Copy: Copy,
  Trash2: Trash2,
}

function resolveIcon(iconName?: string): React.ComponentType<{ className?: string }> {
  if (!iconName) return Check
  return ICON_MAP[iconName] || Check
}

function mapActionVariant(
  variant?: "primary" | "secondary" | "danger" | "ghost"
): "default" | "danger" | "success" | undefined {
  switch (variant) {
    case "primary":
      return "success"
    case "danger":
      return "danger"
    default:
      return "default"
  }
}

// === Cell Config Builder ===

function buildCellConfig(
  cellConfig: SerializableCellConfig,
  pluginRegistry?: PluginRegistry,
  editingOptions?: {
    fieldKey: string
    editing?: ReportConfigV2["editing"]
    lockRules?: LockRule[]
    fieldLockRules?: LockRule[]
    editableByRoles?: string[]
    role?: string
  }
): CellConfig<Row> {
  switch (cellConfig.type) {
    case "text":
      return {
        type: "text",
        value: (row: Row) => (row[cellConfig.field] as string) ?? null,
        ...(cellConfig.subtitleField
          ? {
              subtitle: (row: Row) =>
                (row[cellConfig.subtitleField!] as string) ?? null,
            }
          : {}),
      }

    case "money":
      return {
        type: "money",
        value: (row: Row) => (row[cellConfig.field] as number) ?? null,
        ...(cellConfig.colorClass ? { colorClass: cellConfig.colorClass } : {}),
      }

    case "percent":
      return {
        type: "percent",
        numerator: (row: Row) =>
          (row[cellConfig.numeratorField] as number) ?? null,
        denominator: (row: Row) =>
          (row[cellConfig.denominatorField] as number) ?? null,
        ...(cellConfig.thresholds ? { thresholds: cellConfig.thresholds } : {}),
      }

    case "editable": {
      const config: CellConfig<Row> = {
        type: "editable",
        value: (row: Row) => (row[cellConfig.field] as number) ?? null,
        field: cellConfig.field as keyof Row,
        ...(cellConfig.suffix ? { suffix: cellConfig.suffix } : {}),
        ...(cellConfig.colorClass ? { colorClass: cellConfig.colorClass } : {}),
      }

      if (editingOptions) {
        config.disabled = (row: Row, ctx: TableContext) => {
          if (!editingOptions.editing?.enabled) return true
          if (editingOptions.editableByRoles && editingOptions.editableByRoles.length > 0) {
            if (!editingOptions.editableByRoles.includes(ctx.role)) return true
          }
          return isFieldLocked(
            row,
            editingOptions.fieldKey,
            editingOptions.fieldLockRules,
            editingOptions.lockRules
          )
        }
      }

      return config
    }

    case "status":
      return {
        type: "status",
        value: (row: Row) => (row[cellConfig.field] as string) ?? "",
        labels: cellConfig.labels,
      }

    case "boolean":
      return {
        type: "boolean",
        value: (row: Row) => (row[cellConfig.field] as boolean) ?? null,
      }

    case "enum": {
      // Map enum cell to inline-select plugin
      const plugin = pluginRegistry?.getPlugin("inline-select")
      if (plugin && cellConfig.options) {
        return {
          type: "custom",
          render: (row: Row, ctx: TableContext) => {
            const pluginCtx: TableContext & { extra?: PluginContext } = {
              ...ctx,
              extra: {
                ...ctx.extra,
                pluginProps: {
                  field: cellConfig.field,
                  options: cellConfig.options,
                }
              }
            }
            return plugin(row, pluginCtx)
          },
        }
      }
      // Fallback to text if plugin not found or no options
      return {
        type: "text",
        value: (row: Row) => (row[cellConfig.field] as string) ?? null,
      }
    }

    case "plugin": {
      const plugin = pluginRegistry?.getPlugin(cellConfig.pluginKey)
      if (plugin) {
        return {
          type: "custom",
          render: (row: Row, ctx: TableContext) => {
            const pluginCtx: TableContext & { extra?: PluginContext } = {
              ...ctx,
              extra: {
                ...ctx.extra,
                pluginProps: cellConfig.props
              }
            }
            return plugin(row, pluginCtx)
          },
        }
      }
      return {
        type: "text",
        value: () => `[plugin: ${cellConfig.pluginKey}]`,
      }
    }
  }
}

function buildSummaryConfig(
  summary: NonNullable<SerializableColumnConfig["summary"]>,
  field: string
) {
  return {
    aggregate: summary.aggregate as "sum" | "avg" | "count" | "median" | "min" | "max",
    field: (row: Row) => (row[field] as number) ?? null,
    format: summary.format,
  }
}

// === Main Build Function (backwards compatible) ===

export function buildColumnsFromConfig(
  columns: SerializableColumnConfig[],
  pluginRegistryOrOptions?: PluginRegistry | BuildColumnsOptions
): ColumnDef<Row>[] {
  let options: BuildColumnsOptions = {}
  if (pluginRegistryOrOptions && "getPlugin" in pluginRegistryOrOptions) {
    options = { pluginRegistry: pluginRegistryOrOptions }
  } else if (pluginRegistryOrOptions) {
    options = pluginRegistryOrOptions
  }

  const result = columns.map((col) => {
    const editingOpts = options.editing
      ? {
          fieldKey: col.field,
          editing: options.editing,
          lockRules: options.lockRules,
          fieldLockRules: options.fieldLockRules?.[col.field],
          editableByRoles: options.fieldEditableByRoles?.[col.field],
          role: options.role,
        }
      : undefined

    const columnDef: ColumnDef<Row> = {
      key: col.key,
      label: col.label,
      cell: buildCellConfig(col.cell, options.pluginRegistry, editingOpts),
      ...(col.width ? { width: col.width } : {}),
      ...(col.minWidth ? { minWidth: col.minWidth } : {}),
      ...(col.align ? { align: col.align } : {}),
      ...(col.sortable !== undefined ? { sortable: col.sortable } : {}),
      ...(col.hideable !== undefined ? { hideable: col.hideable } : {}),
    }

    if (col.sortable) {
      columnDef.sortValue = (row: Row) => {
        const val = row[col.field]
        if (val === null || val === undefined) return null
        if (typeof val === "number") return val
        return String(val)
      }
    }

    if (col.summary) {
      columnDef.summary = buildSummaryConfig(col.summary, col.field)
    }

    return columnDef
  })

  // Add actions column if actions are defined or default actions enabled
  const customActions = options.actions || []
  const defaultActions = options.enableDefaultActions ? getDefaultActions() : []
  const allActions = [...defaultActions, ...customActions]

  if (allActions.length > 0 && options.onAction) {
    const rowActions = allActions.filter((a) => a.scope === "row")
    if (rowActions.length > 0) {
      const onAction = options.onAction
      const role = options.role

      result.push({
        key: "__actions__",
        label: "Действия",
        width: "auto",
        cell: {
          type: "actions",
          items: rowActions.map((action) => ({
            key: action.key,
            icon: resolveIcon(action.icon),
            label: action.label,
            onClick: (row: Row) => onAction(action, row),
            visible: (row: Row) => {
              if (action.allowedRoles && action.allowedRoles.length > 0) {
                if (!role || !action.allowedRoles.includes(role)) return false
              }
              return evaluateConditions(row, action.visibleWhen)
            },
            disabled: (row: Row) => {
              if (!action.disabledWhen || action.disabledWhen.length === 0) return false
              return evaluateConditions(row, action.disabledWhen)
            },
            variant: mapActionVariant(action.variant),
          })),
        },
      })
    }
  }

  return result
}

// === Computed Fields Builder ===

export function buildComputedFields(
  computedColumns: ComputedColumnConfig[]
): ComputedField<Row>[] {
  return computedColumns.map((cc) => {
    const compiled = compileFormula(cc.formula)
    return {
      field: cc.key as keyof Row,
      dependencies: compiled.dependencies as (keyof Row)[],
      compute: (row: Row) => compiled.evaluate(row),
    }
  })
}
