"use client"

import { DataTable } from "@/components/data-table"
import type { ColumnDef, TableContext } from "@/components/data-table"
import { EditableCellProvider } from "@/components/ui/editable-cell"

interface SalesRow {
  id: string
  name: string
  region: string
  plan: number
  fact: number
  revenue: number
  deals: number
}

const MOCK_DATA: SalesRow[] = [
  { id: "1", name: "Иванов И.", region: "СПб", plan: 1000000, fact: 1200000, revenue: 360000, deals: 12 },
  { id: "2", name: "Петрова А.", region: "СПб", plan: 800000, fact: 950000, revenue: 285000, deals: 9 },
  { id: "3", name: "Сидоров П.", region: "Москва", plan: 1500000, fact: 1100000, revenue: 330000, deals: 8 },
  { id: "4", name: "Козлова М.", region: "Москва", plan: 1200000, fact: 1350000, revenue: 405000, deals: 15 },
  { id: "5", name: "Новиков А.", region: "Краснодар", plan: 600000, fact: 720000, revenue: 216000, deals: 7 },
  { id: "6", name: "Морозова Е.", region: "Краснодар", plan: 500000, fact: 380000, revenue: 114000, deals: 4 },
]

const columns: ColumnDef<SalesRow>[] = [
  {
    key: "name",
    label: "Менеджер",
    width: "160px",
    cell: { type: "text", value: (row) => row.name },
  },
  {
    key: "region",
    label: "Регион",
    width: "120px",
    cell: { type: "text", value: (row) => row.region },
  },
  {
    key: "plan",
    label: "План",
    width: "130px",
    align: "right",
    cell: { type: "money", value: (row) => row.plan },
    summary: { aggregate: "sum", field: (row) => row.plan, format: "money" },
  },
  {
    key: "fact",
    label: "Факт",
    width: "130px",
    align: "right",
    cell: { type: "money", value: (row) => row.fact },
    summary: { aggregate: "sum", field: (row) => row.fact, format: "money" },
  },
  {
    key: "performance",
    label: "%",
    width: "80px",
    align: "right",
    cell: {
      type: "percent",
      numerator: (row) => row.fact,
      denominator: (row) => row.plan,
      thresholds: [
        { value: 100, class: "text-success" },
        { value: 80, class: "text-warning-text" },
        { value: 0, class: "text-error-text" },
      ],
    },
  },
  {
    key: "revenue",
    label: "Выручка",
    width: "130px",
    align: "right",
    cell: { type: "money", value: (row) => row.revenue },
    summary: { aggregate: "sum", field: (row) => row.revenue, format: "money" },
  },
  {
    key: "deals",
    label: "Сделки",
    width: "80px",
    align: "right",
    cell: { type: "text", value: (row) => String(row.deals) },
    summary: { aggregate: "sum", field: (row) => row.deals, format: "number" },
  },
  {
    key: "avg_deal",
    label: "Средняя сделка",
    width: "130px",
    align: "right",
    cell: {
      type: "money",
      value: (row) => row.deals > 0 ? Math.round(row.revenue / row.deals) : null,
    },
    summary: {
      aggregate: "custom",
      custom: (items) => {
        const totalRevenue = items.reduce((s, r) => s + r.revenue, 0)
        const totalDeals = items.reduce((s, r) => s + r.deals, 0)
        return totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : null
      },
      format: "money",
    },
  },
]

const context: TableContext = {
  permissions: ["view"],
  hasPermission: () => true,
  role: "admin",
  currentUserId: "demo",
  
  extra: {},
}

export default function TotalsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Totals & Aggregation</h1>
      <p className="text-text-secondary mb-6">
        Grand totals с разными типами агрегации: sum, count, custom (средняя сделка).
      </p>
      <div className="table-container">
        <div className="table-scroll">
          <EditableCellProvider>
            <DataTable
              initialData={MOCK_DATA}
              getRowKey={(row) => row.id}
              columns={columns}
              context={context}
              totals={{ tableTotals: true, label: "Итого" }}
            />
          </EditableCellProvider>
        </div>
      </div>
    </div>
  )
}
