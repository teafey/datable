"use client"

import * as React from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GroupAction, TableContext } from "../types"

interface GroupHeaderRowProps<T> {
  name: string
  count: number
  level: number
  managerNames: string[]
  isCollapsed: boolean
  onToggle: () => void
  colSpan: number
  headerSummary?: React.ReactNode
  actions?: GroupAction<T>[]
  items: T[]
  ctx: TableContext
  departmentId: string
}

export function GroupHeaderRow<T>({
  name,
  count,
  level,
  managerNames,
  isCollapsed,
  onToggle,
  colSpan,
  headerSummary,
  actions,
  items,
  ctx,
  departmentId,
}: GroupHeaderRowProps<T>) {
  const visibleActions = actions?.filter(a => a.visible?.(items, ctx) ?? true) ?? []

  return (
    <tr
      className="bg-bg-subtle cursor-pointer hover:bg-bg-muted transition-colors select-none"
      onClick={onToggle}
    >
      <td colSpan={colSpan} className="py-2.5" style={{ paddingLeft: `${16 + level * 24}px`, paddingRight: 16 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {level > 0 && (
              <span className="text-text-disabled text-xs mr-0.5">&#x2514;</span>
            )}
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">{name}</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-bg-muted text-text-secondary">
                  {count}
                </span>
              </div>
              {managerNames.length > 0 && (
                <span className="text-xs text-text-tertiary">
                  {managerNames.join(", ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {headerSummary}
            {visibleActions.length > 0 && (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {visibleActions.map(action => (
                  <button
                    key={action.key}
                    onClick={() => action.onClick(items, departmentId)}
                    disabled={action.disabled?.(items, ctx) ?? false}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50",
                      action.variant === "primary" && "bg-accent text-white hover:bg-accent/90",
                      action.variant === "danger" && "bg-error text-white hover:bg-error/90",
                      (!action.variant || action.variant === "secondary") && "bg-bg-muted hover:bg-bg-emphasis text-text-primary"
                    )}
                  >
                    {action.label(items)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}
