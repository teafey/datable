import type { LockRule } from "./types"

/**
 * Evaluate if a specific field is locked for a given row.
 * Checks field-level rules first, then report-level (global) rules.
 * Returns true if the field is locked (non-editable).
 */
export function isFieldLocked(
  row: Record<string, unknown>,
  fieldKey: string | undefined,
  fieldRules?: LockRule[],
  reportRules?: LockRule[]
): boolean {
  if (fieldRules) {
    for (const rule of fieldRules) {
      if (evaluateSingleLockRule(row, rule, fieldKey)) return true
    }
  }
  if (reportRules) {
    for (const rule of reportRules) {
      if (evaluateSingleLockRule(row, rule, fieldKey)) return true
    }
  }
  return false
}

/**
 * Evaluate a single lock rule against a row.
 */
function evaluateSingleLockRule(
  row: Record<string, unknown>,
  rule: LockRule,
  fieldKey?: string
): boolean {
  // If rule targets specific fields and our field is not in the list, skip
  if (fieldKey && rule.affectedFields && rule.affectedFields.length > 0) {
    if (!rule.affectedFields.includes(fieldKey)) return false
  }

  const rowValue = row[rule.field]
  const ruleValue = rule.value

  switch (rule.operator) {
    case "eq":
      return String(rowValue) === String(ruleValue)

    case "neq":
      return String(rowValue) !== String(ruleValue)

    case "in": {
      const values = Array.isArray(ruleValue) ? ruleValue : [ruleValue]
      return values.map(String).includes(String(rowValue))
    }

    case "not_in": {
      const values = Array.isArray(ruleValue) ? ruleValue : [ruleValue]
      return !values.map(String).includes(String(rowValue))
    }

    default:
      return false
  }
}

/**
 * Check if an entire row is locked (any global lock rule applies).
 * Only checks rules without affectedFields (global row-level locks).
 */
export function isRowLocked(
  row: Record<string, unknown>,
  reportRules?: LockRule[]
): boolean {
  if (!reportRules) return false
  for (const rule of reportRules) {
    if (!rule.affectedFields || rule.affectedFields.length === 0) {
      if (evaluateSingleLockRule(row, rule, undefined)) return true
    }
  }
  return false
}
