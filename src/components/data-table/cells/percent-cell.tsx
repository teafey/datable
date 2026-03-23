"use client"

import { formatPercent, cn } from "@/lib/utils"
import type { PercentCellConfig } from "../types"

interface PercentCellProps<T> {
  config: PercentCellConfig<T>
  row: T
}

export function PercentCell<T>({ config, row }: PercentCellProps<T>) {
  const num = config.numerator(row)
  const den = config.denominator(row)

  if (!num || !den || den === 0) {
    const fb = config.fallback?.(row)
    return <span className="text-text-disabled">{fb ?? "—"}</span>
  }

  const percent = (num / den) * 100
  const thresholds = config.thresholds ?? [
    { value: 100, class: "text-success" },
    { value: 0, class: "text-warning" },
  ]

  // Find matching threshold (first one where percent >= value, sorted desc)
  const sorted = [...thresholds].sort((a, b) => b.value - a.value)
  const match = sorted.find((t) => percent >= t.value)
  const colorClass = match?.class ?? ""

  return (
    <span className={cn("tabular-nums font-medium", colorClass)}>
      {formatPercent(percent)}
    </span>
  )
}
