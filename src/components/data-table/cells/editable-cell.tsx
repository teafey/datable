"use client"

import { EditableCell as BaseEditableCell } from "@/components/ui/editable-cell"
import type { EditableCellConfig, TableContext } from "../types"

interface EditableCellWrapperProps<T> {
  config: EditableCellConfig<T>
  row: T
  rowKey: string
  ctx: TableContext
  onFieldChange: (rowKey: string, field: keyof T, value: number | null) => void
}

export function EditableCellWrapper<T>({
  config,
  row,
  rowKey,
  ctx,
  onFieldChange,
}: EditableCellWrapperProps<T>) {
  const value = config.value(row)
  const disabled = config.disabled?.(row, ctx) ?? false

  return (
    <BaseEditableCell
      id={`${rowKey}-${String(config.field)}`}
      value={value}
      onChange={(v) => onFieldChange(rowKey, config.field, v)}
      suffix={config.suffix}
      colorClass={config.colorClass}
      disabled={disabled}
    />
  )
}
