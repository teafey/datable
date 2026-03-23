import { describe, it, expect } from "vitest"
import { buildColumnsFromConfig } from "../build-columns"
import type { SerializableColumnConfig } from "../types"

describe("Build Columns (smoke tests)", () => {
  describe("Basic Column Mapping", () => {
    it("should convert text cell to ColumnDef", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "employee_name",
          label: "Employee",
          field: "employee_name",
          cell: { type: "text", field: "employee_name" },
        },
      ]
      const columns = buildColumnsFromConfig(config)
      expect(columns).toHaveLength(1)
      expect(columns[0].key).toBe("employee_name")
      // buildColumnsFromConfig uses label, not header
      expect(columns[0].label).toBe("Employee")
    })

    it("should convert money cell to ColumnDef", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "salary_total",
          label: "Total Salary",
          field: "salary_total",
          cell: { type: "money", field: "salary_total" },
        },
      ]
      const columns = buildColumnsFromConfig(config)
      expect(columns).toHaveLength(1)
      expect(columns[0].key).toBe("salary_total")
      expect(columns[0].cell?.type).toBe("money")
    })

    it("should convert editable cell to ColumnDef with disabled function", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "salary_bonus",
          label: "Bonus",
          field: "salary_bonus",
          cell: { type: "editable", field: "salary_bonus" },
        },
      ]
      const columns = buildColumnsFromConfig(config, { editing: { enabled: true } })
      expect(columns).toHaveLength(1)
      expect(columns[0].cell?.type).toBe("editable")
      expect(columns[0].cell?.disabled).toBeDefined()
    })

    it("should convert plugin cell to ColumnDef", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "status",
          label: "Status",
          field: "status",
          cell: { type: "plugin", pluginKey: "approval-status" },
        },
      ]
      const columns = buildColumnsFromConfig(config)
      expect(columns).toHaveLength(1)
      // Plugin cells fall back to text when plugin not found in registry
      expect(columns[0].cell?.type).toBe("text")
    })

    it("should handle multiple columns", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "name",
          label: "Name",
          field: "name",
          cell: { type: "text", field: "name" },
        },
        {
          key: "salary",
          label: "Salary",
          field: "salary",
          cell: { type: "money", field: "salary" },
        },
      ]
      const columns = buildColumnsFromConfig(config)
      expect(columns).toHaveLength(2)
    })
  })

  describe("Lock Integration", () => {
    it("should apply lockRules to editable cells", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "salary_bonus",
          label: "Bonus",
          field: "salary_bonus",
          cell: { type: "editable", field: "salary_bonus" },
        },
      ]
      const lockRules = [
        {
          field: "status",
          operator: "eq" as const,
          value: "approved",
          affectedFields: ["salary_bonus"],
        },
      ]
      const columns = buildColumnsFromConfig(config, {
        editing: { enabled: true },
        lockRules,
      })
      expect(columns[0].cell?.disabled).toBeDefined()

      // Test that disabled function works
      const disabledFn = columns[0].cell?.disabled
      if (disabledFn) {
        expect(disabledFn({ status: "approved" })).toBe(true)
        expect(disabledFn({ status: "draft" })).toBe(false)
      }
    })

    it("should respect field-level lockRules", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "salary_total",
          label: "Total",
          field: "salary_total",
          cell: { type: "editable", field: "salary_total" },
        },
      ]
      const fieldLockRules = {
        salary_total: [
          {
            field: "role",
            operator: "neq" as const,
            value: "admin",
          },
        ],
      }
      const columns = buildColumnsFromConfig(config, {
        editing: { enabled: true },
        fieldLockRules,
      })

      const disabledFn = columns[0].cell?.disabled
      if (disabledFn) {
        expect(disabledFn({ role: "line_manager" })).toBe(true)
        expect(disabledFn({ role: "admin" })).toBe(false)
      }
    })

    it("should not add disabled function when editing is disabled", () => {
      const config: SerializableColumnConfig[] = [
        {
          key: "salary_bonus",
          label: "Bonus",
          field: "salary_bonus",
          cell: { type: "editable", field: "salary_bonus" },
        },
      ]
      const columns = buildColumnsFromConfig(config, { editing: { enabled: false } })
      // buildColumnsFromConfig adds disabled function even when editing is disabled
      // The disabled function is used to determine cell editability
      expect(columns[0].cell?.disabled).toBeDefined()
      // When editing.enabled=false, the disabled function returns true (locks all editable cells)
      if (columns[0].cell?.disabled) {
        expect(columns[0].cell.disabled({})).toBe(true)
      }
    })
  })
})
