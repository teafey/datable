"use client"

import { DataTable } from "@/components/data-table"
import type { ColumnDef, TableContext } from "@/components/data-table"
import { EditableCellProvider } from "@/components/ui/editable-cell"

interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  sold: number
  revenue: number
  active: boolean
}

const MOCK_DATA: Product[] = [
  { id: "1", name: "Кирпич М-150", category: "Стройматериалы", price: 15, stock: 50000, sold: 12000, revenue: 180000, active: true },
  { id: "2", name: "Цемент М-500", category: "Стройматериалы", price: 350, stock: 2000, sold: 800, revenue: 280000, active: true },
  { id: "3", name: "Арматура 12мм", category: "Металл", price: 85, stock: 10000, sold: 3500, revenue: 297500, active: true },
  { id: "4", name: "Труба ПНД 110", category: "Трубы", price: 250, stock: 500, sold: 150, revenue: 37500, active: true },
  { id: "5", name: "Песок речной", category: "Стройматериалы", price: 800, stock: 100, sold: 45, revenue: 36000, active: false },
  { id: "6", name: "Щебень 20-40", category: "Стройматериалы", price: 1200, stock: 80, sold: 30, revenue: 36000, active: true },
]

const columns: ColumnDef<Product>[] = [
  {
    key: "name",
    label: "Товар",
    width: "180px",
    sortable: true,
    cell: { type: "text", value: (row) => row.name, subtitle: (row) => row.category },
  },
  {
    key: "price",
    label: "Цена",
    width: "100px",
    align: "right",
    sortable: true,
    hideable: true,
    cell: { type: "money", value: (row) => row.price },
  },
  {
    key: "stock",
    label: "Остаток",
    width: "100px",
    align: "right",
    sortable: true,
    hideable: true,
    cell: { type: "text", value: (row) => String(row.stock) },
    summary: { aggregate: "sum", field: (row) => row.stock, format: "number" },
  },
  {
    key: "sold",
    label: "Продано",
    width: "100px",
    align: "right",
    sortable: true,
    hideable: true,
    cell: { type: "text", value: (row) => String(row.sold) },
    summary: { aggregate: "sum", field: (row) => row.sold, format: "number" },
  },
  {
    key: "revenue",
    label: "Выручка",
    width: "130px",
    align: "right",
    sortable: true,
    hideable: true,
    cell: { type: "money", value: (row) => row.revenue },
    summary: { aggregate: "sum", field: (row) => row.revenue, format: "money" },
  },
  {
    key: "active",
    label: "Активен",
    width: "90px",
    align: "center",
    hideable: true,
    cell: { type: "boolean", value: (row) => row.active },
  },
]

const context: TableContext = {
  permissions: ["view"],
  hasPermission: () => true,
  role: "admin",
  currentUserId: "demo",
  
  extra: {},
}

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Settings & Column Visibility</h1>
      <p className="text-text-secondary mb-6">
        Настройки таблицы: видимость колонок, порядок, итоги. Настройки сохраняются в localStorage.
        Нажмите иконку шестерёнки в заголовке.
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
              settings="demo-settings"
            />
          </EditableCellProvider>
        </div>
      </div>
    </div>
  )
}
