"use client"

import { cn } from "@/lib/utils"
import type { StatusCellConfig } from "../types"

interface StatusCellProps<T> {
  config: StatusCellConfig<T>
  row: T
}

export function StatusCell<T>({ config, row }: StatusCellProps<T>) {
  const value = config.value(row)
  const info = config.labels[value]

  if (!info) return <span className="text-text-disabled">—</span>

  return <span className={cn("badge", info.class)}>{info.label}</span>
}
