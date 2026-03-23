"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import {
  getCurrentEmployeeId,
  checkPageAccess,
  getFilteredEmployeeIds,
  getUserRoleNames,
} from "./permissions"
import { getDataSource } from "@/lib/reports/data-sources"
import type { ReportConfig, ReportConfigV2 } from "@/lib/reports/types"

export interface ReportRecord {
  id: string
  name: string
  description: string | null
  dataSourceKey: string
  config: ReportConfig | ReportConfigV2
  version: number
  dataSourceId: string | null
  isShared: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

const SALARY_RESTRICTED_FIELDS = [
  "salary_base",
  "salary_official",
  "salary_unofficial",
  "salary_total",
  "salary_bonus",
  "salary_penalty",
  "advance_amount",
]

export async function getReports(): Promise<ReportRecord[]> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return []

  const hasAccess = await checkPageAccess(employeeId, "view_analytics")
  if (!hasAccess) return []

  const { data, error } = await supabaseAdmin
    .from("report_configs")
    .select("*")
    .or(`created_by.eq.${employeeId},is_shared.eq.true`)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching reports:", error)
    return []
  }

  return (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    dataSourceKey: r.data_source_key,
    config: r.config as unknown as ReportConfig | ReportConfigV2,
    version: r.version ?? 1,
    dataSourceId: r.data_source_id ?? null,
    isShared: r.is_shared,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function getReport(
  id: string
): Promise<ReportRecord | null> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return null

  const hasAccess = await checkPageAccess(employeeId, "view_analytics")
  if (!hasAccess) return null

  const { data, error } = await supabaseAdmin
    .from("report_configs")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Error fetching report:", error)
    return null
  }

  if (data.created_by !== employeeId && !data.is_shared) {
    return null
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    dataSourceKey: data.data_source_key,
    config: data.config as unknown as ReportConfig | ReportConfigV2,
    version: data.version ?? 1,
    dataSourceId: data.data_source_id ?? null,
    isShared: data.is_shared,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function createReport(
  reportConfig: ReportConfig | ReportConfigV2
): Promise<{ success: boolean; error?: string; id?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const hasAccess = await checkPageAccess(employeeId, "manage_roles")
  if (!hasAccess) return { success: false, error: "Нет прав на создание отчётов" }

  const isV2 = "version" in reportConfig && reportConfig.version === 2
  const v2Config = isV2 ? (reportConfig as ReportConfigV2) : null

  const insertData: Record<string, unknown> = {
    name: reportConfig.name,
    description: reportConfig.description || null,
    data_source_key: reportConfig.dataSourceKey ?? null,
    config: reportConfig as unknown as Record<string, unknown>,
    created_by: employeeId,
    is_shared: reportConfig.isShared || false,
    version: isV2 ? 2 : 1,
  }

  if (v2Config?.dataSourceId) {
    insertData.data_source_id = v2Config.dataSourceId
  }

  const { data, error } = await supabaseAdmin
    .from("report_configs")
    .insert(insertData)
    .select("id")
    .single()

  if (error) {
    console.error("Error creating report:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reports")
  return { success: true, id: data.id }
}

export async function updateReport(
  id: string,
  reportConfig: Partial<ReportConfig> | Partial<ReportConfigV2>
): Promise<{ success: boolean; error?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const hasAccess = await checkPageAccess(employeeId, "manage_roles")
  if (!hasAccess) return { success: false, error: "Нет прав на редактирование отчётов" }

  const { data: existing } = await supabaseAdmin
    .from("report_configs")
    .select("created_by")
    .eq("id", id)
    .single()

  if (!existing) {
    return { success: false, error: "Отчёт не найден" }
  }

  const isV2 = "version" in reportConfig && reportConfig.version === 2
  const v2Config = isV2 ? (reportConfig as Partial<ReportConfigV2>) : null

  const updateData: Record<string, unknown> = {}
  if (reportConfig.name !== undefined) updateData.name = reportConfig.name
  if (reportConfig.description !== undefined)
    updateData.description = reportConfig.description
  if (reportConfig.dataSourceKey !== undefined)
    updateData.data_source_key = reportConfig.dataSourceKey
  if (reportConfig.isShared !== undefined)
    updateData.is_shared = reportConfig.isShared

  // Always store full config for both v1 and v2
  updateData.config = reportConfig as unknown as Record<string, unknown>

  if (isV2) {
    updateData.version = 2
    if (v2Config?.dataSourceId !== undefined)
      updateData.data_source_id = v2Config.dataSourceId
  }

  const { error } = await supabaseAdmin
    .from("report_configs")
    .update(updateData)
    .eq("id", id)

  if (error) {
    console.error("Error updating report:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reports")
  return { success: true }
}

export async function deleteReport(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const { data: existing } = await supabaseAdmin
    .from("report_configs")
    .select("created_by")
    .eq("id", id)
    .single()

  if (!existing) {
    return { success: false, error: "Отчёт не найден" }
  }

  // Владелец может удалять, или admin (manage_roles)
  if (existing.created_by !== employeeId) {
    const isAdmin = await checkPageAccess(employeeId, "manage_roles")
    if (!isAdmin) {
      return { success: false, error: "Нет прав на удаление" }
    }
  }

  const { error } = await supabaseAdmin
    .from("report_configs")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting report:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reports")
  return { success: true }
}

export async function fetchReportData(
  dataSourceKey: string,
  filters?: Record<string, unknown>
): Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  // 1. Проверка доступа к аналитике
  const hasAccess = await checkPageAccess(employeeId, "view_analytics")
  if (!hasAccess) return { success: false, error: "Нет прав на просмотр отчётов" }

  const dataSource = getDataSource(dataSourceKey)
  if (!dataSource) {
    return { success: false, error: `Источник данных "${dataSourceKey}" не найден` }
  }

  try {
    // 2. Получить сырые данные
    let data = await dataSource.fetch(filters)

    // 3. Scope-фильтрация: показать только сотрудников, доступных по scope
    const allowedIds = await getFilteredEmployeeIds(employeeId, "view_analytics")
    const allowedSet = new Set(allowedIds)

    if (dataSourceKey === "employees_current") {
      data = data.filter((row) => allowedSet.has(row.id as string))
    } else if (dataSourceKey === "monthly_performance") {
      data = data.filter((row) => allowedSet.has(row.employee_id as string))
    }

    // 4. Salary stripping для accounting (не видят зарплаты)
    const roleNames = await getUserRoleNames(employeeId)
    const isAccounting = roleNames.includes("accounting")
    const hasSalaryAccess =
      roleNames.includes("admin") ||
      roleNames.includes("cfo") ||
      roleNames.includes("cco")

    if (isAccounting && !hasSalaryAccess) {
      data = data.map((row) => {
        const filtered = { ...row }
        for (const field of SALARY_RESTRICTED_FIELDS) {
          delete filtered[field]
        }
        return filtered
      })
    }

    return { success: true, data }
  } catch (err) {
    console.error("Error fetching report data:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка загрузки данных",
    }
  }
}
