"use server"

import { supabaseAdmin } from "@/lib/supabase"
import type { UserProfile, UserRole } from "@/lib/auth-utils"

export type { UserProfile, UserRole } from "@/lib/auth-utils"

/**
 * Get current user profile by Supabase auth user ID.
 * Maps auth.uid() → users.id → roles/permissions.
 */
export async function getCurrentUserProfile(
  authUserId: string
): Promise<UserProfile | null> {
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email")
    .eq("auth_user_id", authUserId)
    .single()

  if (userError || !user) {
    console.error("Error fetching user profile:", userError)
    return null
  }

  const [userRolesResult, permissionsResult] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select(
        `
        role:roles (
          id,
          role_name,
          description
        )
      `
      )
      .eq("user_id", user.id),
    getUserPermissions(user.id),
  ])

  const roles: UserRole[] =
    userRolesResult.data?.map((ur) => ({
      id: (ur.role as unknown as { id: string }).id,
      name: (ur.role as unknown as { role_name: string }).role_name,
      description:
        (ur.role as unknown as { description: string | null }).description,
    })) || []

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    roles,
    permissions: permissionsResult,
  }
}

/**
 * Get user permissions via DB function.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.rpc("get_user_permissions", {
    p_user_id: userId,
  })

  if (error) {
    console.error("Error fetching permissions:", error)
    return []
  }

  return data || []
}

/**
 * Check permission via DB function.
 */
export async function checkPermission(
  userId: string,
  permissionKey: string,
  targetUserId?: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("check_permission", {
    p_user_id: userId,
    p_permission_key: permissionKey,
    p_target_user_id: targetUserId,
  })

  if (error) {
    console.error("Error checking permission:", error)
    return false
  }

  return data || false
}
