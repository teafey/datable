"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export interface RoleUser {
  id: string
  userId: string
  userName: string
}

/**
 * Get users assigned to a role.
 */
export async function getRoleUsers(roleId: string): Promise<RoleUser[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select(
      `
      id,
      user_id,
      user:users!user_roles_user_id_fkey (id, full_name)
    `
    )
    .eq("role_id", roleId)

  if (error) {
    console.error("Error fetching role users:", error)
    return []
  }

  return (data || []).map((ur) => ({
    id: ur.id,
    userId: ur.user_id,
    userName:
      (ur.user as unknown as { full_name: string } | null)?.full_name ||
      "Unknown",
  }))
}

/**
 * Get all registered users (with auth_user_id linked).
 */
export async function getRegisteredUsers(): Promise<
  { id: string; fullName: string }[]
> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name")
    .not("auth_user_id", "is", null)
    .order("full_name")

  if (error) {
    console.error("Error fetching registered users:", error)
    return []
  }

  return (data || []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
  }))
}

/**
 * Add user to a role.
 */
export async function addUserToRole(
  roleId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role_id", roleId)
    .eq("user_id", userId)
    .single()

  if (existing) {
    return { success: false, error: "User already has this role" }
  }

  const { error } = await supabaseAdmin.from("user_roles").insert({
    role_id: roleId,
    user_id: userId,
  })

  if (error) {
    console.error("Error adding user to role:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

/**
 * Remove user from a role.
 */
export async function removeUserFromRole(
  userRoleId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("id", userRoleId)

  if (error) {
    console.error("Error removing user from role:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

// ============================================
// Permissions Management
// ============================================

import type { PermissionScope } from "./permissions"

export interface Permission {
  id: string
  permissionKey: string
  description: string | null
  resource: string | null
  action: string | null
}

export interface RolePermission {
  permissionKey: string
  scope: PermissionScope
}

/**
 * Get all system permissions.
 */
export async function getPermissions(): Promise<Permission[]> {
  const { data, error } = await supabaseAdmin
    .from("permissions")
    .select("id, permission_key, description, resource, action")
    .order("permission_key")

  if (error) {
    console.error("Error fetching permissions:", error)
    return []
  }

  return (data || []).map((p) => ({
    id: p.id,
    permissionKey: p.permission_key,
    description: p.description,
    resource: p.resource,
    action: p.action,
  }))
}

/**
 * Get permissions for a specific role.
 */
export async function getRolePermissions(
  roleId: string
): Promise<RolePermission[]> {
  const { data, error } = await supabaseAdmin
    .from("role_permissions")
    .select("permission_key, scope")
    .eq("role_id", roleId)

  if (error) {
    console.error("Error fetching role permissions:", error)
    return []
  }

  return (data || []).map((rp) => ({
    permissionKey: rp.permission_key,
    scope: rp.scope as PermissionScope,
  }))
}

/**
 * Add permission to a role.
 */
export async function addPermissionToRole(
  roleId: string,
  permissionKey: string,
  scope: PermissionScope = "own"
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from("role_permissions").insert({
    role_id: roleId,
    permission_key: permissionKey,
    scope,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

/**
 * Remove permission from a role.
 */
export async function removePermissionFromRole(
  roleId: string,
  permissionKey: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId)
    .eq("permission_key", permissionKey)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

/**
 * Update permission scope.
 */
export async function updatePermissionScope(
  roleId: string,
  permissionKey: string,
  scope: PermissionScope
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("role_permissions")
    .update({ scope })
    .eq("role_id", roleId)
    .eq("permission_key", permissionKey)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}
