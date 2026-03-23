import { describe, it, expect } from "vitest"
import { isFieldLocked, isRowLocked } from "../lock-engine"
import type { LockRule } from "../types"

describe("Lock Engine", () => {
  describe("Basic Operators", () => {
    it("should lock field when eq operator matches", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus"],
      }
      const row = { status: "approved", salary_bonus: 5000 }
      expect(isFieldLocked(row, "salary_bonus", [rule])).toBe(true)
    })

    it("should not lock field when eq operator does not match", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus"],
      }
      const row = { status: "draft", salary_bonus: 5000 }
      expect(isFieldLocked(row, "salary_bonus", [rule])).toBe(false)
    })

    it("should lock field when neq operator matches", () => {
      const rule: LockRule = {
        field: "role",
        operator: "neq",
        value: "admin",
        affectedFields: ["salary_total"],
      }
      const row = { role: "line_manager", salary_total: 100000 }
      expect(isFieldLocked(row, "salary_total", [rule])).toBe(true)
    })

    it("should not lock field when neq operator does not match", () => {
      const rule: LockRule = {
        field: "role",
        operator: "neq",
        value: "admin",
        affectedFields: ["salary_total"],
      }
      const row = { role: "admin", salary_total: 100000 }
      expect(isFieldLocked(row, "salary_total", [rule])).toBe(false)
    })

    it("should lock field when in operator matches", () => {
      const rule: LockRule = {
        field: "status",
        operator: "in",
        value: ["approved", "paid"],
        affectedFields: ["salary_base"],
      }
      const row = { status: "approved", salary_base: 80000 }
      expect(isFieldLocked(row, "salary_base", [rule])).toBe(true)
    })

    it("should not lock field when in operator does not match", () => {
      const rule: LockRule = {
        field: "status",
        operator: "in",
        value: ["approved", "paid"],
        affectedFields: ["salary_base"],
      }
      const row = { status: "draft", salary_base: 80000 }
      expect(isFieldLocked(row, "salary_base", [rule])).toBe(false)
    })

    it("should lock field when not_in operator matches", () => {
      const rule: LockRule = {
        field: "role",
        operator: "not_in",
        value: ["cfo", "admin"],
        affectedFields: ["salary_official"],
      }
      const row = { role: "line_manager", salary_official: 50000 }
      expect(isFieldLocked(row, "salary_official", [rule])).toBe(true)
    })

    it("should not lock field when not_in operator does not match", () => {
      const rule: LockRule = {
        field: "role",
        operator: "not_in",
        value: ["cfo", "admin"],
        affectedFields: ["salary_official"],
      }
      const row = { role: "cfo", salary_official: 50000 }
      expect(isFieldLocked(row, "salary_official", [rule])).toBe(false)
    })

    it("should handle string coercion for eq operator", () => {
      const rule: LockRule = {
        field: "count",
        operator: "eq",
        value: "123",
        affectedFields: ["field"],
      }
      const row = { count: 123, field: "value" }
      expect(isFieldLocked(row, "field", [rule])).toBe(true)
    })
  })

  describe("Field-level Locks", () => {
    it("should only lock specified affectedFields", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus", "salary_penalty"],
      }
      const row = { status: "approved" }
      expect(isFieldLocked(row, "salary_bonus", [rule])).toBe(true)
      expect(isFieldLocked(row, "salary_penalty", [rule])).toBe(true)
      expect(isFieldLocked(row, "salary_base", [rule])).toBe(false)
    })

    it("should lock all fields when affectedFields is empty", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
      }
      const row = { status: "approved" }
      expect(isFieldLocked(row, "salary_bonus", [], [rule])).toBe(true)
      expect(isFieldLocked(row, "salary_penalty", [], [rule])).toBe(true)
      expect(isFieldLocked(row, "any_field", [], [rule])).toBe(true)
    })

    it("should apply multiple rules with AND logic", () => {
      const rules: LockRule[] = [
        {
          field: "status",
          operator: "eq",
          value: "approved",
          affectedFields: ["salary_bonus"],
        },
        {
          field: "role",
          operator: "neq",
          value: "admin",
          affectedFields: ["salary_bonus"],
        },
      ]
      const row = { status: "approved", role: "line_manager" }
      expect(isFieldLocked(row, "salary_bonus", rules)).toBe(true)
    })

    it("should not lock if field not in affectedFields", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus", "salary_penalty"],
      }
      const row = { status: "approved" }
      expect(isFieldLocked(row, "employee_name", [rule])).toBe(false)
    })
  })

  describe("Report-level Locks", () => {
    it("should apply global lock rule from reportRules", () => {
      const reportRule: LockRule = {
        field: "status",
        operator: "eq",
        value: "paid",
      }
      const row = { status: "paid" }
      expect(isFieldLocked(row, "any_field", [], [reportRule])).toBe(true)
    })

    it("should combine field rules and report rules", () => {
      const fieldRule: LockRule = {
        field: "role",
        operator: "eq",
        value: "accounting",
        affectedFields: ["salary_total"],
      }
      const reportRule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus"],
      }
      const row = { role: "accounting", status: "approved" }
      expect(isFieldLocked(row, "salary_total", [fieldRule], [reportRule])).toBe(true)
      expect(isFieldLocked(row, "salary_bonus", [fieldRule], [reportRule])).toBe(true)
    })

    it("should check multiple report rules", () => {
      const reportRules: LockRule[] = [
        {
          field: "status",
          operator: "eq",
          value: "approved",
          affectedFields: ["salary_bonus"],
        },
        {
          field: "status",
          operator: "eq",
          value: "paid",
          affectedFields: ["salary_penalty"],
        },
      ]
      const approvedRow = { status: "approved" }
      const paidRow = { status: "paid" }
      expect(isFieldLocked(approvedRow, "salary_bonus", [], reportRules)).toBe(true)
      expect(isFieldLocked(paidRow, "salary_penalty", [], reportRules)).toBe(true)
    })

    it("should use isRowLocked for global locks", () => {
      const reportRule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
      }
      const row = { status: "approved" }
      expect(isRowLocked(row, [reportRule])).toBe(true)
    })
  })

  describe("Edge Cases", () => {
    it("should return false when no rules provided", () => {
      const row = { status: "approved" }
      expect(isFieldLocked(row, "salary_bonus")).toBe(false)
      expect(isFieldLocked(row, "salary_bonus", [])).toBe(false)
      expect(isFieldLocked(row, "salary_bonus", [], [])).toBe(false)
    })

    it("should handle null values in row", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus"],
      }
      const row = { status: null }
      expect(isFieldLocked(row, "salary_bonus", [rule])).toBe(false)
    })

    it("should handle undefined values in row", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus"],
      }
      const row = { status: undefined }
      expect(isFieldLocked(row, "salary_bonus", [rule])).toBe(false)
    })

    it("should handle missing field in row", () => {
      const rule: LockRule = {
        field: "nonexistent",
        operator: "eq",
        value: "value",
        affectedFields: ["salary_bonus"],
      }
      const row = { status: "approved" }
      expect(isFieldLocked(row, "salary_bonus", [rule])).toBe(false)
    })

    it("should handle empty affectedFields array", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: [],
      }
      const row = { status: "approved" }
      // Empty affectedFields means global lock (all fields)
      expect(isFieldLocked(row, "any_field", [], [rule])).toBe(true)
    })

    it("should handle undefined fieldKey", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
      }
      const row = { status: "approved" }
      expect(isFieldLocked(row, undefined, [], [rule])).toBe(true)
    })

    it("should return false from isRowLocked when no global rules", () => {
      const rule: LockRule = {
        field: "status",
        operator: "eq",
        value: "approved",
        affectedFields: ["salary_bonus"],
      }
      const row = { status: "approved" }
      // This rule has affectedFields, so it's not a global lock
      expect(isRowLocked(row, [rule])).toBe(false)
    })

    it("should handle in operator with single value", () => {
      const rule: LockRule = {
        field: "status",
        operator: "in",
        value: "approved",
        affectedFields: ["field"],
      }
      const row = { status: "approved" }
      expect(isFieldLocked(row, "field", [rule])).toBe(true)
    })
  })
})
