/**
 * Shared TypeScript types for datatable-app.
 * Generic types — no business-domain specifics.
 */

// ============================================
// RBAC types
// ============================================

export type PermissionScope =
  | "own"
  | "team"
  | "department"
  | "city"
  | "all"

// ============================================
// API Response types
// ============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
