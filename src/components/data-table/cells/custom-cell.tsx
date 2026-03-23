"use client"

import type { CustomCellConfig, TableContext } from "../types"

interface CustomCellProps<T> {
  config: CustomCellConfig<T>
  row: T
  ctx: TableContext
}

export function CustomCell<T>({ config, row, ctx }: CustomCellProps<T>) {
  return <>{config.render(row, ctx)}</>
}
