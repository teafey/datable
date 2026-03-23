"use client"

import { formatMoney, cn } from "@/lib/utils"
import type { MoneyCellConfig } from "../types"

interface MoneyCellProps<T> {
  config: MoneyCellConfig<T>
  row: T
}

export function MoneyCell<T>({ config, row }: MoneyCellProps<T>) {
  const value = config.value(row)
  return (
    <span className={cn("tabular-nums", config.colorClass)}>
      {value !== null ? (
        <span
          className="money"
          data-value={value}
          onCopy={(e) => {
            e.preventDefault()
            const rawValue = e.currentTarget.getAttribute('data-value')
            if (rawValue && e.clipboardData) {
              e.clipboardData.setData('text/plain', rawValue)
            }
          }}
        >
          {formatMoney(value)}
        </span>
      ) : (
        <span className="text-text-disabled">—</span>
      )}
    </span>
  )
}
