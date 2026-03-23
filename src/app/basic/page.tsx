"use client"

import { DataTable } from "@/components/data-table"
import type { ColumnDef, TableContext } from "@/components/data-table"
import { EditableCellProvider } from "@/components/ui/editable-cell"

interface Employee {
  id: string
  name: string
  position: string
  department: string
  salary: number
  status: string
  performance: number
  plan: number
}

const MOCK_DATA: Employee[] = [
  { id: "1", name: "Иванов Иван", position: "Менеджер", department: "Продажи", salary: 120000, status: "staff", performance: 85, plan: 100 },
  { id: "2", name: "Петрова Анна", position: "Старший менеджер", department: "Продажи", salary: 180000, status: "goldfinger", performance: 130, plan: 100 },
  { id: "3", name: "Сидоров Павел", position: "Разработчик", department: "Разработка", salary: 200000, status: "staff", performance: 92, plan: 100 },
  { id: "4", name: "Козлова Мария", position: "Дизайнер", department: "Маркетинг", salary: 150000, status: "intern", performance: 0, plan: 0 },
  { id: "5", name: "Новиков Алексей", position: "Аналитик", department: "Разработка", salary: 170000, status: "staff", performance: 105, plan: 100 },
  { id: "6", name: "Морозова Елена", position: "HR", department: "Бухгалтерия", salary: 130000, status: "staff", performance: 0, plan: 0 },
  { id: "7", name: "Волков Дмитрий", position: "Снабженец", department: "Снабжение", salary: 110000, status: "new", performance: 0, plan: 0 },
  { id: "8", name: "Лебедева Ольга", position: "Маркетолог", department: "Маркетинг", salary: 140000, status: "staff", performance: 78, plan: 100 },
]

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  new: { label: "Новый", class: "badge-info" },
  intern: { label: "Стажёр", class: "badge-warning" },
  staff: { label: "Штатный", class: "badge-success" },
  goldfinger: { label: "Топ", class: "badge-accent" },
  fired: { label: "Уволен", class: "badge-error" },
}

const columns: ColumnDef<Employee>[] = [
  {
    key: "name",
    label: "Сотрудник",
    width: "200px",
    sortable: true,
    cell: {
      type: "text",
      value: (row) => row.name,
      subtitle: (row) => row.position,
    },
  },
  {
    key: "department",
    label: "Отдел",
    width: "150px",
    sortable: true,
    cell: {
      type: "text",
      value: (row) => row.department,
    },
  },
  {
    key: "salary",
    label: "Зарплата",
    width: "130px",
    align: "right",
    sortable: true,
    cell: {
      type: "money",
      value: (row) => row.salary,
    },
    summary: {
      aggregate: "sum",
      field: (row) => row.salary,
      format: "money",
    },
  },
  {
    key: "performance",
    label: "Выполнение",
    width: "120px",
    align: "right",
    cell: {
      type: "percent",
      numerator: (row) => row.performance,
      denominator: (row) => row.plan,
      thresholds: [
        { value: 100, class: "text-success" },
        { value: 80, class: "text-warning-text" },
        { value: 0, class: "text-error-text" },
      ],
    },
  },
  {
    key: "status",
    label: "Статус",
    width: "120px",
    sortable: true,
    cell: {
      type: "status",
      value: (row) => row.status,
      labels: STATUS_LABELS,
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

export default function BasicPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Basic Table</h1>
      <p className="text-text-secondary mb-6">
        Демонстрация базовых типов ячеек: text, money, percent, status.
      </p>
      <div className="table-container">
        <div className="table-scroll">
          <EditableCellProvider>
            <DataTable
              initialData={MOCK_DATA}
              getRowKey={(row) => row.id}
              columns={columns}
              context={context}
              emptyMessage="Нет данных"
            />
          </EditableCellProvider>
        </div>
      </div>
    </div>
  )
}
