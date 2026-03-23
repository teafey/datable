// Client-side auth utilities (no "use server")

export interface UserProfile {
  id: string
  fullName: string
  email: string | null
  roles: UserRole[]
  permissions: string[]
}

export interface UserRole {
  id: string
  name: string
  description: string | null
}

/**
 * Get primary role for display in UI.
 * Returns the highest-priority role, or fallback if no roles.
 *
 * @param roles - user's roles
 * @param rolePriority - ordered list of role names (highest first). If omitted, first role wins.
 * @param roleLabels - optional display labels for role names
 */
export function getPrimaryRole(
  roles: UserRole[],
  rolePriority?: string[],
  roleLabels?: Record<string, string>
): { name: string; label: string } {
  const labels: Record<string, string> = {
    admin: "Administrator",
    ...roleLabels,
  }

  if (rolePriority) {
    for (const name of rolePriority) {
      const role = roles.find((r) => r.name === name)
      if (role) {
        return {
          name: role.name,
          label: labels[role.name] || role.description || role.name,
        }
      }
    }
  }

  // No priority list or no match — return first role
  if (roles.length > 0) {
    const role = roles[0]
    return {
      name: role.name,
      label: labels[role.name] || role.description || role.name,
    }
  }

  return { name: "user", label: "User" }
}
