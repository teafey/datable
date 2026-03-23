"use client"

import * as React from "react"
import type { PluginRenderer } from "../plugin-registry"

/**
 * Context shape expected by the employee-name plugin (optional).
 * If not provided, plugin renders plain text.
 */
interface EmployeeNameContext {
  onOpenEmployeeCard?: (employeeId: string) => void
}

/**
 * Internal component for rendering employee name
 */
function EmployeeNameCell({ row, ctx }: { row: Record<string, unknown>; ctx: any }) {
  const employeeId = row.employee_id as string | undefined
  const employeeName = (row.employee_name || row.full_name) as string | undefined
  const extra = ctx.extra as unknown as EmployeeNameContext | undefined

  const handleClick = () => {
    if (extra?.onOpenEmployeeCard && employeeId) {
      extra.onOpenEmployeeCard(employeeId)
    }
  }

  // If no handler provided or no employee ID, render plain text
  if (!extra?.onOpenEmployeeCard || !employeeId) {
    return <span className="text-sm text-text-primary">{employeeName || "—"}</span>
  }

  // Render clickable name
  return (
    <button
      onClick={handleClick}
      className="text-sm text-text-primary hover:text-primary-brand underline-offset-2 hover:underline transition-colors cursor-pointer"
      title="Открыть карточку сотрудника"
      type="button"
    >
      {employeeName || "—"}
    </button>
  )
}

/**
 * Renders a clickable employee name that opens EmployeeDetailModal.
 *
 * **Default behavior (out-of-box):**
 * - Renders plain text if no context handler provided
 * - Click handler opens employee card modal when configured
 *
 * Works without any context configuration!
 *
 * Expected row fields:
 *  - employee_id: string (required for click handler)
 *  - employee_name: string (preferred) OR full_name: string
 *
 * Optional ctx (for modal integration):
 *  - extra.onOpenEmployeeCard(employeeId)
 */
export const employeeNameRenderer: PluginRenderer = (row, ctx) => {
  return React.createElement(EmployeeNameCell, { row, ctx })
}
