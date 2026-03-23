"use client"

import { DataTable } from "@/components/data-table"
import type { ColumnDef, TableContext, GroupingConfig } from "@/components/data-table"
import type { DepartmentHierarchyInfo } from "@/lib/api/departments"
import { EditableCellProvider } from "@/components/ui/editable-cell"

interface TeamMember {
  id: string
  name: string
  position: string
  department_id: string
  salary: number
  status: string
}

const HIERARCHY: DepartmentHierarchyInfo[] = [
  { id: "sales", name: "Отдел продаж", parentId: null, managerNames: ["Смирнов А.В."] },
  { id: "sales-nc", name: "НЦ", parentId: "sales", managerNames: ["Кузнецов Д.И."] },
  { id: "sales-os", name: "ОС", parentId: "sales", managerNames: ["Попов С.А."] },
  { id: "supply", name: "Снабжение", parentId: null, managerNames: ["Васильев П.Н."] },
  { id: "dev", name: "Разработка", parentId: null, managerNames: ["Фёдоров И.М."] },
  { id: "marketing", name: "Маркетинг", parentId: null, managerNames: [] },
]

const MOCK_DATA: TeamMember[] = [
  { id: "1", name: "Иванов Иван", position: "Менеджер", department_id: "sales-nc", salary: 120000, status: "staff" },
  { id: "2", name: "Петрова Анна", position: "Старший менеджер", department_id: "sales-nc", salary: 180000, status: "goldfinger" },
  { id: "3", name: "Козлов Михаил", position: "Менеджер", department_id: "sales-os", salary: 110000, status: "staff" },
  { id: "4", name: "Новикова Елена", position: "Менеджер", department_id: "sales-os", salary: 125000, status: "staff" },
  { id: "5", name: "Сидоров Павел", position: "Разработчик", department_id: "dev", salary: 200000, status: "staff" },
  { id: "6", name: "Морозова Ольга", position: "Разработчик", department_id: "dev", salary: 190000, status: "staff" },
  { id: "7", name: "Волков Дмитрий", position: "Снабженец", department_id: "supply", salary: 100000, status: "intern" },
  { id: "8", name: "Лебедева Мария", position: "Маркетолог", department_id: "marketing", salary: 140000, status: "staff" },
]

const columns: ColumnDef<TeamMember>[] = [
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
    key: "salary",
    label: "Зарплата",
    width: "140px",
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
    key: "status",
    label: "Статус",
    width: "120px",
    cell: {
      type: "status",
      value: (row) => row.status,
      labels: {
        new: { label: "Новый", class: "badge-info" },
        intern: { label: "Стажёр", class: "badge-warning" },
        staff: { label: "Штатный", class: "badge-success" },
        goldfinger: { label: "Топ", class: "badge-accent" },
      },
    },
  },
]

const grouping: GroupingConfig<TeamMember> = {
  enabled: true,
  mode: "hierarchy",
  getDepartmentId: (row) => row.department_id,
  hierarchy: HIERARCHY,
  defaultCollapsed: false,
}

const context: TableContext = {
  permissions: ["view"],
  hasPermission: () => true,
  role: "admin",
  currentUserId: "demo",
  
  extra: {},
}

export default function GroupingPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Grouping</h1>
      <p className="text-text-secondary mb-6">
        Иерархическая группировка по отделам. Сворачивание/разворачивание, итоги по группам.
      </p>
      <div className="table-container">
        <div className="table-scroll">
          <EditableCellProvider>
            <DataTable
              initialData={MOCK_DATA}
              getRowKey={(row) => row.id}
              columns={columns}
              context={context}
              grouping={grouping}
              totals={{ groupTotals: true, tableTotals: true, label: "Итого", groupLabel: "Итого по отделу" }}
              settings="demo-grouping"
            />
          </EditableCellProvider>
        </div>
      </div>
    </div>
  )
}
