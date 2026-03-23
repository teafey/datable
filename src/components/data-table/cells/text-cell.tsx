"use client"

import { cn } from "@/lib/utils"
import type { TextCellConfig } from "../types"

interface TextCellProps<T> {
  config: TextCellConfig<T>
  row: T
}

export function TextCell<T>({ config, row }: TextCellProps<T>) {
  const value = config.value(row)
  const subtitle = config.subtitle?.(row)

  return (
    <div
      className={cn(
        "flex-1",
        config.onClick && "cursor-pointer hover:text-accent transition-colors"
      )}
      onClick={config.onClick ? () => config.onClick!(row) : undefined}
    >
      <p className="font-medium text-text-primary">{value ?? "—"}</p>
      {subtitle && (
        <p className="text-xs text-text-tertiary">{subtitle}</p>
      )}
    </div>
  )
}
