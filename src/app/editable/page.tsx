"use client"

import { useState } from "react"
import { DataTable } from "@/components/data-table"
import type { ColumnDef, TableContext, ComputedField } from "@/components/data-table"
import { EditableCellProvider } from "@/components/ui/editable-cell"

interface SalaryRow {
  id: string
  name: string
  salary_base: number | null
  salary_bonuses: number | null
  salary_penalties: number | null
  salary_total: number | null
}

const INITIAL_DATA: SalaryRow[] = [
  { id: "1", name: "Иванов Иван", salary_base: 100000, salary_bonuses: 20000, salary_penalties: 5000, salary_total: 115000 },
  { id: "2", name: "Петрова Анна", salary_base: 150000, salary_bonuses: 50000, salary_penalties: 0, salary_total: 200000 },
  { id: "3", name: "Сидоров Павел", salary_base: 120000, salary_bonuses: 10000, salary_penalties: 3000, salary_total: 127000 },
  { id: "4", name: "Козлова Мария", salary_base: 90000, salary_bonuses: null, salary_penalties: null, salary_total: 90000 },
  { id: "5", name: "Новиков Алексей", salary_base: 130000, salary_bonuses: 25000, salary_penalties: 0, salary_total: 155000 },
]

const computedFields: ComputedField<SalaryRow>[] = [
  {
    field: "salary_total",
    dependencies: ["salary_base", "salary_bonuses", "salary_penalties"],
    compute: (row) => (row.salary_base || 0) + (row.salary_bonuses || 0) - (row.salary_penalties || 0),
  },
]

const columns: ColumnDef<SalaryRow>[] = [
  {
    key: "name",
    label: "Сотрудник",
    width: "200px",
    cell: { type: "text", value: (row) => row.name },
  },
  {
    key: "salary_base",
    label: "Оклад",
    width: "140px",
    align: "right",
    cell: {
      type: "editable",
      value: (row) => row.salary_base,
      field: "salary_base",
      suffix: "₽",
    },
    summary: { aggregate: "sum", field: (row) => row.salary_base, format: "money" },
  },
  {
    key: "salary_bonuses",
    label: "Бонусы",
    width: "140px",
    align: "right",
    cell: {
      type: "editable",
      value: (row) => row.salary_bonuses,
      field: "salary_bonuses",
      suffix: "₽",
      colorClass: "text-success-text",
    },
    summary: { aggregate: "sum", field: (row) => row.salary_bonuses, format: "money" },
  },
  {
    key: "salary_penalties",
    label: "Штрафы",
    width: "140px",
    align: "right",
    cell: {
      type: "editable",
      value: (row) => row.salary_penalties,
      field: "salary_penalties",
      suffix: "₽",
      colorClass: "text-error-text",
    },
    summary: { aggregate: "sum", field: (row) => row.salary_penalties, format: "money" },
  },
  {
    key: "salary_total",
    label: "Итого",
    width: "140px",
    align: "right",
    cell: {
      type: "money",
      value: (row) => row.salary_total,
      colorClass: "font-semibold",
    },
    summary: { aggregate: "sum", field: (row) => row.salary_total, format: "money" },
  },
]

const context: TableContext = {
  permissions: ["edit"],
  hasPermission: () => true,
  role: "admin",
  currentUserId: "demo",
  
  extra: {},
}

export default function EditablePage() {
  const [savedRows, setSavedRows] = useState<string[]>([])

  const handleSave = async (row: SalaryRow, changedFields: (keyof SalaryRow)[]) => {
    // Simulate server save
    await new Promise((resolve) => setTimeout(resolve, 300))
    setSavedRows((prev) => [...prev, `${row.name}: ${changedFields.join(", ")}`])
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Editable Table</h1>
      <p className="text-text-secondary mb-6">
        Inline-редактирование ячеек с автовычислением поля &quot;Итого&quot;. Tab-навигация между ячейками.
      </p>
      <div className="table-container">
        <div className="table-scroll">
          <EditableCellProvider>
            <DataTable
              initialData={INITIAL_DATA}
              getRowKey={(row) => row.id}
              columns={columns}
              computedFields={computedFields}
              context={context}
              onSave={handleSave}
              saveDebounce={1000}
              totals={{ tableTotals: true, label: "Итого" }}
            />
          </EditableCellProvider>
        </div>
      </div>

      {savedRows.length > 0 && (
        <div className="mt-4 card">
          <h3 className="card-header">Save Log</h3>
          <ul className="text-sm text-text-secondary space-y-1">
            {savedRows.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
