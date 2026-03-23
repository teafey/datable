import type { ActionCondition, ActionDef } from "./types"

/**
 * Built-in default row actions available without configuration
 */
export const DEFAULT_ACTIONS = {
  COPY_ROW: {
    key: 'copy-row',
    label: 'Копировать',
    icon: 'Copy',
    variant: 'ghost' as const,
    scope: 'row' as const,
    targetField: '',
    targetValue: '',
    builtIn: true
  },
  DELETE_ROW: {
    key: 'delete-row',
    label: 'Удалить',
    icon: 'Trash2',
    variant: 'danger' as const,
    scope: 'row' as const,
    targetField: '',
    targetValue: '',
    confirmMessage: 'Вы уверены, что хотите удалить эту запись?',
    builtIn: true
  }
} as const

/**
 * Get list of default actions that are always available
 */
export function getDefaultActions(): ActionDef[] {
  return Object.values(DEFAULT_ACTIONS)
}

/**
 * Evaluate a list of conditions against a row.
 * All conditions must be true (AND logic).
 * Returns true if ALL conditions pass, or if conditions is empty/undefined.
 */
export function evaluateConditions(
  row: Record<string, unknown>,
  conditions?: ActionCondition[]
): boolean {
  if (!conditions || conditions.length === 0) return true

  return conditions.every((cond) => {
    const rowValue = row[cond.field]

    switch (cond.operator) {
      case "eq":
        return String(rowValue) === String(cond.value)

      case "neq":
        return String(rowValue) !== String(cond.value)

      case "in": {
        const values = Array.isArray(cond.value) ? cond.value : [cond.value]
        return values.map(String).includes(String(rowValue))
      }

      case "not_in": {
        const values = Array.isArray(cond.value) ? cond.value : [cond.value]
        return !values.map(String).includes(String(rowValue))
      }

      case "gt":
        return Number(rowValue) > Number(cond.value)

      case "lt":
        return Number(rowValue) < Number(cond.value)

      case "is_null":
        return rowValue === null || rowValue === undefined

      case "is_not_null":
        return rowValue !== null && rowValue !== undefined

      default:
        return true
    }
  })
}

/**
 * Filter rows by conditions (for bulk actions with rowFilter).
 */
export function filterRowsByConditions(
  rows: Record<string, unknown>[],
  conditions?: ActionCondition[]
): Record<string, unknown>[] {
  if (!conditions || conditions.length === 0) return rows
  return rows.filter((row) => evaluateConditions(row, conditions))
}

/**
 * Check if an action is visible for a given row (row-level actions).
 */
export function isActionVisible(
  action: ActionDef,
  row: Record<string, unknown>,
  userRole?: string
): boolean {
  if (action.allowedRoles && action.allowedRoles.length > 0) {
    if (!userRole) return false
    if (!action.allowedRoles.includes(userRole)) return false
  }
  return evaluateConditions(row, action.visibleWhen)
}

/**
 * Check if an action is disabled for a given row.
 * disabledWhen means: disable when ALL conditions are true.
 */
export function isActionDisabled(
  action: ActionDef,
  row: Record<string, unknown>
): boolean {
  if (!action.disabledWhen || action.disabledWhen.length === 0) return false
  return evaluateConditions(row, action.disabledWhen)
}

/**
 * Check if a table/group-level action is visible.
 * For group/table actions, checks role restrictions and whether any matching rows exist.
 */
export function isGroupActionVisible(
  action: ActionDef,
  rows: Record<string, unknown>[],
  userRole?: string
): boolean {
  if (action.allowedRoles && action.allowedRoles.length > 0) {
    if (!userRole) return false
    if (!action.allowedRoles.includes(userRole)) return false
  }
  if (action.rowFilter) {
    const matchingRows = filterRowsByConditions(rows, action.rowFilter)
    return matchingRows.length > 0
  }
  return true
}

/**
 * Get rows that would be affected by a bulk action.
 */
export function getActionTargetRows(
  action: ActionDef,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  return filterRowsByConditions(rows, action.rowFilter)
}

/**
 * Replace {count} placeholder in action label.
 */
export function resolveActionLabel(
  action: ActionDef,
  targetCount?: number
): string {
  let label = action.label
  if (targetCount !== undefined) {
    label = label.replace("{count}", String(targetCount))
  }
  return label
}
