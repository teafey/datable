"use client"

import { useState } from "react"
import { Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActionsCellConfig, TableContext } from "../types"

interface ActionsCellProps<T> {
  config: ActionsCellConfig<T>
  row: T
  rowKey: string
  ctx: TableContext
  loadingActions: Map<string, Set<string>>
  setActionLoading: (
    rowKey: string,
    actionKey: string,
    loading: boolean
  ) => void
}

const variantClasses: Record<string, string> = {
  default: "text-text-tertiary hover:text-accent",
  danger: "text-text-tertiary hover:text-error",
  success: "text-text-tertiary hover:text-success",
}

export function ActionsCell<T>({
  config,
  row,
  rowKey,
  ctx,
  loadingActions,
  setActionLoading,
}: ActionsCellProps<T>) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const visibleItems = config.items.filter(
    (item) => item.visible?.(row, ctx) ?? true
  )

  if (visibleItems.length === 0) return null

  const rowLoading = loadingActions.get(rowKey)

  async function handleCopyRow(row: T) {
    const record = row as Record<string, unknown>
    const text = Object.entries(record)
      .filter(([key]) => !key.startsWith("_"))
      .map(([key, value]) => `${key}: ${value ?? ""}`)
      .join("\n")

    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy to clipboard:", err)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {visibleItems.map((item) => {
        const isLoading = rowLoading?.has(item.key) ?? false
        const isDisabled = isLoading || (item.disabled?.(row, ctx) ?? false)
        const Icon = item.icon
        const isCopied = copiedKey === `${rowKey}-${item.key}`
        const DisplayIcon = isCopied ? Check : Icon

        return (
          <button
            key={item.key}
            onClick={async (e) => {
              e.stopPropagation()

              if (item.key === "copy-row") {
                await handleCopyRow(row)
                setCopiedKey(`${rowKey}-${item.key}`)
                setTimeout(() => setCopiedKey(null), 1500)
                return
              }

              if (item.key === "delete-row") {
                const confirmed = window.confirm(
                  "Вы уверены, что хотите удалить эту запись?"
                )
                if (!confirmed) return
              }

              setActionLoading(rowKey, item.key, true)
              try {
                await item.onClick(row)
              } finally {
                setActionLoading(rowKey, item.key, false)
              }
            }}
            disabled={isDisabled}
            className={cn(
              "p-1 rounded hover:bg-bg-muted transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
              isCopied ? "text-success" : variantClasses[item.variant ?? "default"]
            )}
            title={item.label}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DisplayIcon className="h-4 w-4" />
            )}
          </button>
        )
      })}
    </div>
  )
}
