"use client"

import * as React from "react"
import { formatMoney, cn } from "@/lib/utils"
import type { PluginRenderer } from "../plugin-registry"

/**
 * Context shape expected by the payment-cell plugin.
 */
interface PaymentCellContext {
  canEdit: boolean
  period: string
  onSavePayment?: (employeeId: string, period: string, amount: number) => Promise<void>
}

/**
 * Renders an editable money input for official payment amounts.
 * When canEdit is true, shows a debounced number input.
 * When canEdit is false, shows the formatted amount or a dash.
 *
 * Expected row fields:
 *  - id: string (employee id)
 *  - amountPaid: number | null
 *
 * Expected ctx:
 *  - extra.canEdit: boolean
 *  - extra.period: string
 *  - extra.onSavePayment?: (employeeId, period, amount) => Promise<void>
 */
export const paymentCellRenderer: PluginRenderer = (row, ctx) => {
  const employeeId = row.id as string
  const amountPaid = row.amountPaid as number | null | undefined
  const extra = ctx.extra as unknown as PaymentCellContext | undefined
  const canEdit = extra?.canEdit ?? false
  const period = extra?.period ?? ""
  const onSavePayment = extra?.onSavePayment

  if (canEdit) {
    return React.createElement(PaymentInput, {
      employeeId,
      initialValue: amountPaid ?? undefined,
      period,
      onSave: onSavePayment,
    })
  }

  return React.createElement(
    "span",
    { className: "tabular-nums" },
    amountPaid !== null && amountPaid !== undefined && amountPaid > 0
      ? React.createElement(
          "span",
          {
            className: "money",
            "data-value": amountPaid,
            onCopy: (e: React.ClipboardEvent<HTMLSpanElement>) => {
              e.preventDefault()
              const rawValue = e.currentTarget.getAttribute('data-value')
              if (rawValue && e.clipboardData) {
                e.clipboardData.setData('text/plain', rawValue)
              }
            }
          },
          formatMoney(amountPaid)
        )
      : "\u2014"
  )
}

/**
 * Internal component: debounced number input for payment amounts.
 */
function PaymentInput({
  employeeId,
  initialValue,
  period,
  onSave,
}: {
  employeeId: string
  initialValue?: number
  period: string
  onSave?: (employeeId: string, period: string, amount: number) => Promise<void>
}) {
  const [value, setValue] = React.useState(String(initialValue ?? ""))
  const [isSaving, setIsSaving] = React.useState(false)
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleChange = (newValue: string) => {
    setValue(newValue)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!onSave) return
    debounceRef.current = setTimeout(async () => {
      const amount = parseFloat(newValue) || 0
      setIsSaving(true)
      await onSave(employeeId, period, amount)
      setIsSaving(false)
    }, 800)
  }

  return React.createElement(
    "div",
    { className: "flex items-center justify-end gap-1" },
    React.createElement("input", {
      type: "number",
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value),
      className: cn(
        "w-28 px-2 py-1 text-right text-sm border rounded bg-bg-base focus:outline-none focus:ring-1 focus:ring-accent tabular-nums",
        isSaving ? "border-warning" : "border-border-default"
      ),
      min: "0",
      step: "0.01",
      placeholder: "0",
    }),
    React.createElement("span", { className: "text-sm text-text-tertiary" }, "\u20BD")
  )
}
