"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export interface CreateDepartmentInput {
  name: string
  parentId?: string | null
  cityId?: string | null
  hasSalesPlan?: boolean
  isRevenueOwner?: boolean
}

export interface UpdateDepartmentInput {
  name?: string
  parentId?: string | null
  cityId?: string | null
  hasSalesPlan?: boolean
  isRevenueOwner?: boolean
}

export interface AddDepartmentManagerInput {
  departmentId: string
  employeeId: string
  cityId?: string | null
}

export interface DepartmentManager {
  id: string
  employee_id: string
  employee_name: string
  city_id: string | null
  city_name: string | null
}

// Create a new department
export async function createDepartment(input: CreateDepartmentInput) {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .insert({
      name: input.name,
      parent_id: input.parentId || null,
      city_id: input.cityId || null,
      has_sales_plan: input.hasSalesPlan ?? true,
      is_revenue_owner: input.isRevenueOwner ?? false,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating department:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true, id: data.id }
}

// Update department (name, parent, city, hasSalesPlan)
export async function updateDepartment(id: string, input: UpdateDepartmentInput) {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updateData.name = input.name
  }
  if (input.parentId !== undefined) {
    updateData.parent_id = input.parentId || null
  }
  if (input.cityId !== undefined) {
    updateData.city_id = input.cityId || null
  }
  if (input.hasSalesPlan !== undefined) {
    updateData.has_sales_plan = input.hasSalesPlan
  }
  if (input.isRevenueOwner !== undefined) {
    updateData.is_revenue_owner = input.isRevenueOwner
  }

  const { error } = await supabaseAdmin
    .from("departments")
    .update(updateData)
    .eq("id", id)

  if (error) {
    console.error("Error updating department:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

// Delete department
export async function deleteDepartment(id: string) {
  // First check if department has employees
  const { data: positions } = await supabaseAdmin
    .from("position_history")
    .select("id")
    .eq("department_id", id)
    .is("date_end", null)
    .limit(1)

  if (positions && positions.length > 0) {
    return { success: false, error: "Нельзя удалить отдел с сотрудниками" }
  }

  // Check if department has children
  const { data: children } = await supabaseAdmin
    .from("departments")
    .select("id")
    .eq("parent_id", id)
    .limit(1)

  if (children && children.length > 0) {
    return { success: false, error: "Нельзя удалить отдел с подотделами" }
  }

  const { error } = await supabaseAdmin
    .from("departments")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting department:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

// ==================== Department Managers CRUD ====================

// Get managers for a department
export async function getDepartmentManagers(departmentId: string): Promise<DepartmentManager[]> {
  const { data, error } = await supabaseAdmin
    .from("department_managers")
    .select(`
      id,
      employee_id,
      city_id,
      employees!department_managers_employee_id_fkey (full_name),
      cities (name)
    `)
    .eq("department_id", departmentId)

  if (error) {
    console.error("Error fetching department managers:", error)
    return []
  }

  return (data || []).map((row) => ({
    id: row.id,
    employee_id: row.employee_id,
    employee_name: (row.employees as unknown as { full_name: string } | null)?.full_name || "Unknown",
    city_id: row.city_id,
    city_name: (row.cities as unknown as { name: string } | null)?.name || null,
  }))
}

// Add a manager to department
export async function addDepartmentManager(input: AddDepartmentManagerInput) {
  const { error } = await supabaseAdmin
    .from("department_managers")
    .insert({
      department_id: input.departmentId,
      employee_id: input.employeeId,
      city_id: input.cityId || null,
    })

  if (error) {
    console.error("Error adding department manager:", error)
    if (error.code === "23505") {
      return { success: false, error: "Этот сотрудник уже назначен руководителем" }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

// Remove a manager from department
export async function removeDepartmentManager(managerId: string) {
  const { error } = await supabaseAdmin
    .from("department_managers")
    .delete()
    .eq("id", managerId)

  if (error) {
    console.error("Error removing department manager:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

// Update manager's city scope
export async function updateDepartmentManagerCity(managerId: string, cityId: string | null) {
  const { error } = await supabaseAdmin
    .from("department_managers")
    .update({ city_id: cityId })
    .eq("id", managerId)

  if (error) {
    console.error("Error updating manager city:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function getAllDepartmentManagerNames(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin
    .from("department_managers")
    .select(`
      department_id,
      employee:employees!department_managers_employee_id_fkey (full_name)
    `)

  const result: Record<string, string> = {}
  data?.forEach((dm) => {
    const emp = dm.employee as unknown as { full_name: string } | null
    if (emp?.full_name && dm.department_id) {
      if (!result[dm.department_id]) {
        result[dm.department_id] = emp.full_name
      }
    }
  })
  return result
}

// ==================== Department Hierarchy ====================

export interface DepartmentHierarchyInfo {
  id: string
  name: string
  parentId: string | null
  managerNames: string[]
}

export async function getDepartmentHierarchyForManager(userId: string): Promise<DepartmentHierarchyInfo[]> {
  const [hierarchy, { data: managedDepts }] = await Promise.all([
    getDepartmentHierarchy(),
    supabaseAdmin
      .from("department_managers")
      .select("department_id")
      .eq("employee_id", userId),
  ])

  // No records in department_managers → CFO/admin/cco → full hierarchy
  if (!managedDepts?.length) return hierarchy

  const managedIds = new Set(managedDepts.map((d) => d.department_id))

  // Build parent→children map for traversal
  const childrenMap = new Map<string | null, DepartmentHierarchyInfo[]>()
  for (const dept of hierarchy) {
    const children = childrenMap.get(dept.parentId) || []
    children.push(dept)
    childrenMap.set(dept.parentId, children)
  }

  // Recursively collect all descendants of a department
  const collectDescendants = (parentId: string): DepartmentHierarchyInfo[] => {
    const children = childrenMap.get(parentId) || []
    const result: DepartmentHierarchyInfo[] = []
    for (const child of children) {
      result.push(child)
      result.push(...collectDescendants(child.id))
    }
    return result
  }

  // Collect managed departments + all their descendants
  const result: DepartmentHierarchyInfo[] = []
  for (const dept of hierarchy) {
    if (managedIds.has(dept.id)) {
      // Managed department becomes a root node
      result.push({ ...dept, parentId: null })
      result.push(...collectDescendants(dept.id))
    }
  }

  return result
}

export async function getDepartmentHierarchy(): Promise<DepartmentHierarchyInfo[]> {
  const [{ data: departments }, { data: managers }] = await Promise.all([
    supabaseAdmin
      .from("departments")
      .select("id, name, parent_id")
      .order("name"),
    supabaseAdmin
      .from("department_managers")
      .select(`
        department_id,
        employee:employees!department_managers_employee_id_fkey (full_name)
      `),
  ])

  // Build manager names map: departmentId -> string[]
  const managerMap = new Map<string, string[]>()
  managers?.forEach((dm) => {
    const emp = dm.employee as unknown as { full_name: string } | null
    if (emp?.full_name && dm.department_id) {
      const names = managerMap.get(dm.department_id) || []
      if (!names.includes(emp.full_name)) {
        names.push(emp.full_name)
      }
      managerMap.set(dm.department_id, names)
    }
  })

  return (departments || []).map((d) => ({
    id: d.id,
    name: d.name,
    parentId: d.parent_id,
    managerNames: managerMap.get(d.id) || [],
  }))
}
