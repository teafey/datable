"use client"

import { Check, X } from "lucide-react"
import type { BooleanCellConfig } from "../types"

interface BooleanCellProps<T> {
  config: BooleanCellConfig<T>
  row: T
}

export function BooleanCell<T>({ config, row }: BooleanCellProps<T>) {
  const value = config.value(row)

  if (value === null || value === undefined) {
    return <span className="text-text-disabled">—</span>
  }

  const icon = value ? (
    <Check className="h-4 w-4 text-success" />
  ) : (
    <X className="h-4 w-4 text-text-tertiary" />
  )

  if (config.onChange) {
    return (
      <button
        onClick={() => config.onChange!(row)}
        className="p-1 rounded hover:bg-bg-muted transition-colors"
      >
        {icon}
      </button>
    )
  }

  return icon
}
