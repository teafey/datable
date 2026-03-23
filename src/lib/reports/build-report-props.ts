import type { ColumnDef, ComputedField, GroupingConfig } from "@/components/data-table/types"
import type { DepartmentHierarchyInfo } from "@/lib/api/departments"
import type {
  ReportConfig,
  ReportConfigV2,
  DataSourceConfig,
  LockRule,
  ActionDef,
} from "./types"
import { buildColumnsFromConfig, buildComputedFields } from "./build-columns"
import type { BuildColumnsOptions } from "./build-columns"
import { evaluateConditions } from "./action-engine"

type Row = Record<string, unknown>

export interface ReportTableProps {
  columns: ColumnDef<Row>[]
  computedFields?: ComputedField<Row>[]
  grouping?: GroupingConfig<Row>
  totals?: {
    groupTotals?: boolean
    tableTotals?: boolean
    label?: string
    groupLabel?: string
  }
  onSave?: (row: Row, changedFields: (keyof Row)[]) => Promise<void>
  saveDebounce?: number
  settingsKey: string
}

/**
 * Build full DataTable props from a report config.
 * Handles both v1 (ReportConfig) and v2 (ReportConfigV2).
 */
export function buildReportTableProps(options: {
  config: ReportConfig | ReportConfigV2
  dataSource?: DataSourceConfig | null
  role?: string
  permissions?: string[]
  departmentHierarchy?: DepartmentHierarchyInfo[]
  onSave?: (row: Row, changedFields: (keyof Row)[]) => Promise<void>
  onAction?: (action: ActionDef, row: Row) => void
}): ReportTableProps {
  const { config, dataSource, role, permissions, departmentHierarchy, onSave, onAction } = options

  const isV2 = "version" in config && config.version === 2
  const v2Config = isV2 ? (config as ReportConfigV2) : null

  // Build column options
  const buildOptions: BuildColumnsOptions = {}

  if (v2Config) {
    buildOptions.editing = v2Config.editing
    buildOptions.lockRules = v2Config.lockRules
    buildOptions.actions = v2Config.actions
    buildOptions.enableDefaultActions = v2Config.enableDefaultActions
    buildOptions.role = role
    buildOptions.permissions = permissions
    buildOptions.onAction = onAction

    // Build field-level editing permissions and lock rules from data source fields
    if (dataSource) {
      const fieldEditableByRoles: Record<string, string[]> = {}
      const fieldLockRules: Record<string, LockRule[]> = {}

      for (const field of dataSource.fields) {
        if (field.editableByRoles && field.editableByRoles.length > 0) {
          fieldEditableByRoles[field.key] = field.editableByRoles
        }
        if (field.lockRules && field.lockRules.length > 0) {
          fieldLockRules[field.key] = field.lockRules
        }
      }

      buildOptions.fieldEditableByRoles = fieldEditableByRoles
      buildOptions.fieldLockRules = fieldLockRules
    }
  }

  // Build columns
  const columns = buildColumnsFromConfig(config.columns, buildOptions)

  // Build computed fields
  let computedFields: ComputedField<Row>[] | undefined
  if (v2Config?.computedColumns && v2Config.computedColumns.length > 0) {
    computedFields = buildComputedFields(v2Config.computedColumns)
  } else if (dataSource?.computedColumns && dataSource.computedColumns.length > 0) {
    computedFields = buildComputedFields(dataSource.computedColumns)
  }

  // Build grouping
  let grouping: GroupingConfig<Row> | undefined
  if (config.grouping?.enabled) {
    // Multi-field grouping (new)
    const fields = (config.grouping as { fields?: string[] }).fields
    if (fields && fields.length > 0) {
      const isDepartmentGrouping = /department/i.test(fields[0])
      grouping = {
        enabled: true,
        mode: isDepartmentGrouping ? "hierarchy" : "flat",
        fields,
        getDepartmentId: (row: Row) =>
          (row[`${fields[0]}_id`] as string) ??
          (row[fields[0]] as string) ??
          null,
        getGroupKey: (row: Row, level: number) => {
          const field = fields[level]
          if (!field) return null
          return (row[`${field}_id`] as string) ?? (row[field] as string) ?? null
        },
        getGroupLabel: (groupKey: string | null, level: number, firstRowInGroup?: Row) => {
          if (!groupKey) return null
          const field = fields[level]
          if (!field) return groupKey

          // For department grouping, use hierarchy to find the name
          if (isDepartmentGrouping && departmentHierarchy) {
            const dept = departmentHierarchy.find(d => d.id === groupKey)
            if (dept) return dept.name
          }

          // For other fields, try to find a matching display field in the data
          // Priority: {field}_name > {field} (without _id suffix)
          // Example: city_id=1 → look for city_name or city
          if (firstRowInGroup) {
            // Try {field}_name first
            const nameField = `${field}_name`
            if (nameField in firstRowInGroup && firstRowInGroup[nameField] != null) {
              return String(firstRowInGroup[nameField])
            }

            // Try field without _id suffix
            if (field.endsWith('_id')) {
              const baseField = field.replace(/_id$/, '')
              if (baseField in firstRowInGroup && firstRowInGroup[baseField] != null) {
                return String(firstRowInGroup[baseField])
              }
            }
          }

          // Fallback: use the key as-is
          return groupKey
        },
        hierarchy: isDepartmentGrouping ? (departmentHierarchy || []) : [],
        defaultCollapsed: config.grouping.defaultCollapsed ?? false,
      }
    }
    // Single-field grouping (legacy, backward compatibility)
    else if (config.grouping.field) {
      const groupField = config.grouping.field
      const isDepartmentGrouping = /department/i.test(groupField)
      grouping = {
        enabled: true,
        mode: isDepartmentGrouping ? "hierarchy" : "flat",
        getDepartmentId: (row: Row) =>
          (row[`${groupField}_id`] as string) ??
          (row[groupField] as string) ??
          null,
        hierarchy: isDepartmentGrouping ? (departmentHierarchy || []) : [],
        defaultCollapsed: config.grouping.defaultCollapsed ?? false,
      }
    }

    // Add group-level actions
    if (grouping && v2Config?.actions) {
      const groupActions = v2Config.actions.filter((a) => a.scope === "group")
      if (groupActions.length > 0 && onAction) {
        grouping.actions = groupActions.map((action) => ({
          key: action.key,
          label: (items: Row[]) => {
            const count = action.rowFilter
              ? items.filter((item) => evaluateConditions(item, action.rowFilter)).length
              : items.length
            return action.label.replace("{count}", String(count))
          },
          onClick: (items: Row[], departmentId: string) => {
            // Pass all matching items to the action handler
            for (const item of items) {
              onAction(action, item)
            }
          },
          visible: (items: Row[]) => {
            if (action.allowedRoles && action.allowedRoles.length > 0) {
              if (!role || !action.allowedRoles.includes(role)) return false
            }
            if (action.rowFilter) {
              const matching = items.filter((item) => evaluateConditions(item, action.rowFilter))
              return matching.length > 0
            }
            return true
          },
          variant: action.variant === "danger" ? "danger" : "primary",
        }))
      }
    }
  }

  // Build totals
  const totals = config.totals
    ? {
        groupTotals: config.totals.groupTotals,
        tableTotals: config.totals.tableTotals,
        label: config.totals.label,
        groupLabel: config.totals.groupLabel,
      }
    : undefined

  // Determine save debounce
  const saveDebounce = v2Config?.editing?.saveDebounce ?? 1500

  return {
    columns,
    computedFields,
    grouping,
    totals,
    onSave: v2Config?.editing?.enabled ? onSave : undefined,
    saveDebounce,
    settingsKey: `report-${config.id ?? "preview"}`,
  }
}
