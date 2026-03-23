"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabase"
import { checkPermission } from "./auth"

export type PermissionScope = "own" | "team" | "department" | "city" | "all"

interface UserPermissionWithScope {
  permissionKey: string
  scope: PermissionScope
}

/**
 * Get current user ID from session.
 * Maps auth.uid() → users.id via auth_user_id column.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .single()

  return user?.id || null
}

// Backward compatibility alias
export const getCurrentEmployeeId = getCurrentUserId

/**
 * Get user permissions with scope.
 * When user has multiple roles, the maximum scope for each permission wins.
 */
export async function getUserPermissionsWithScope(
  userId: string
): Promise<UserPermissionWithScope[]> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select(
      `
      role:roles (
        role_permissions (
          permission_key,
          scope
        )
      )
    `
    )
    .eq("user_id", userId)

  const scopePriority: PermissionScope[] = [
    "own",
    "team",
    "department",
    "city",
    "all",
  ]
  const permMap = new Map<string, PermissionScope>()

  data?.forEach((ur) => {
    const role = ur.role as unknown as {
      role_permissions: { permission_key: string; scope: string }[]
    } | null
    role?.role_permissions?.forEach((rp) => {
      const current = permMap.get(rp.permission_key)
      const newScope = rp.scope as PermissionScope
      if (
        !current ||
        scopePriority.indexOf(newScope) > scopePriority.indexOf(current)
      ) {
        permMap.set(rp.permission_key, newScope)
      }
    })
  })

  return Array.from(permMap.entries()).map(([permissionKey, scope]) => ({
    permissionKey,
    scope,
  }))
}

/**
 * Check if user has a specific permission (any scope).
 */
export async function checkPageAccess(
  userId: string,
  requiredPermission: string
): Promise<boolean> {
  const permissions = await getUserPermissionsWithScope(userId)
  return permissions.some((p) => p.permissionKey === requiredPermission)
}

/**
 * Get scope of a specific permission for a user.
 */
export async function getPermissionScope(
  userId: string,
  permissionKey: string
): Promise<PermissionScope | null> {
  const permissions = await getUserPermissionsWithScope(userId)
  const perm = permissions.find((p) => p.permissionKey === permissionKey)
  return perm?.scope ?? null
}

/**
 * Get IDs of records accessible to the user based on permission scope.
 * For "all" scope, returns all records from the given table.
 * For scoped access, delegates to resolve_scope DB function.
 */
export async function getFilteredRecordIds(
  userId: string,
  permissionKey: string,
  table: string = "users"
): Promise<string[]> {
  const scope = await getPermissionScope(userId, permissionKey)
  if (!scope) return []

  if (scope === "all") {
    const { data } = await supabaseAdmin.from(table).select("id")
    return data?.map((r) => r.id) || []
  }

  if (scope === "own") {
    return [userId]
  }

  // For team/department/city scopes, try the resolve_scope RPC
  const { data, error } = await supabaseAdmin.rpc("resolve_scope", {
    p_user_id: userId,
    p_scope: scope,
    p_table: table,
  })

  if (!error && data) {
    return data as string[]
  }

  // Fallback: return own ID
  return [userId]
}

// Backward compatibility alias
export const getFilteredEmployeeIds = getFilteredRecordIds

/**
 * Get user's role names.
 */
export async function getUserRoleNames(userId: string): Promise<string[]> {
  const { data: userRoles } = await supabaseAdmin
    .from("user_roles")
    .select(`role:roles (role_name)`)
    .eq("user_id", userId)

  return (
    (userRoles
      ?.map((ur) => {
        const role = ur.role as unknown as { role_name: string } | null
        return role?.role_name
      })
      .filter(Boolean) as string[]) || []
  )
}

/**
 * Authenticate and check permission for an action.
 */
export async function authenticateForAction(
  permission: string
): Promise<{ userId: string } | { success: false; error: string }> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }

  const hasAccess = await checkPageAccess(userId, permission)
  if (!hasAccess) return { success: false, error: "Permission denied" }

  return { userId }
}

/**
 * Authenticate and verify permission for a specific target user.
 */
export async function authenticateForUser(
  targetUserId: string,
  permission: string
): Promise<{ userId: string } | { success: false; error: string }> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }

  const hasAccess = await checkPermission(userId, permission, targetUserId)
  if (!hasAccess) return { success: false, error: "Permission denied" }

  return { userId }
}

// Backward compatibility aliases
export const authenticateForEmployee = authenticateForUser
export const authenticateApprover = () => authenticateForAction("approve_payroll")
