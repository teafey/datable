"use client"

import * as React from "react"
import { Check, CheckCheck, Loader2 } from "lucide-react"
import type { PluginRenderer } from "../plugin-registry"

/**
 * Context shape expected by the approval-status plugin.
 * The page passes these callbacks via TableContext.extra.
 */
interface ApprovalStatusContext {
  onConfirmRecord: (performanceId: string) => void
  onApproveRecord: (performanceId: string) => void
  confirmingRecords: Set<string>
  approvingRecords: Set<string>
}

/**
 * Renders a performance record status badge with inline confirm/approve action buttons.
 *
 * Expected row fields:
 *  - status: "draft" | "manager_confirmed" | "approved" | "paid"
 *  - performanceId: string | null
 *
 * Expected ctx (cast to TableContext<ApprovalStatusContext>):
 *  - extra.onConfirmRecord(performanceId)
 *  - extra.onApproveRecord(performanceId)
 *  - extra.confirmingRecords: Set<string>
 *  - extra.approvingRecords: Set<string>
 */
export const approvalStatusRenderer: PluginRenderer = (row, ctx) => {
  const status = row.status as string
  const performanceId = row.performanceId as string | null | undefined
  const extra = ctx.extra as unknown as ApprovalStatusContext | undefined

  // manager_confirmed => show badge + approve button
  if (status === "manager_confirmed" && performanceId) {
    const isApproving = extra?.approvingRecords?.has(performanceId) ?? false

    return React.createElement(
      "div",
      { className: "flex items-center justify-center gap-1" },
      React.createElement("span", { className: "badge badge-success" }, "Подтверждено"),
      extra?.onApproveRecord
        ? React.createElement(
            "button",
            {
              onClick: () => extra.onApproveRecord(performanceId),
              disabled: isApproving,
              className:
                "p-1 rounded hover:bg-bg-muted transition-colors text-text-tertiary hover:text-success disabled:opacity-50",
              title: "Утвердить",
            },
            isApproving
              ? React.createElement(Loader2, { className: "h-3.5 w-3.5 animate-spin" })
              : React.createElement(CheckCheck, { className: "h-3.5 w-3.5" })
          )
        : null
    )
  }

  // approved
  if (status === "approved") {
    return React.createElement("span", { className: "badge badge-info" }, "Утверждено")
  }

  // paid
  if (status === "paid") {
    return React.createElement("span", { className: "badge badge-info" }, "Выплачено")
  }

  // draft => show badge + confirm button
  const isConfirming = performanceId
    ? (extra?.confirmingRecords?.has(performanceId) ?? false)
    : false

  return React.createElement(
    "div",
    { className: "flex items-center justify-center gap-1" },
    React.createElement("span", { className: "badge badge-default" }, "Черновик"),
    performanceId && extra?.onConfirmRecord
      ? React.createElement(
          "button",
          {
            onClick: () => extra.onConfirmRecord(performanceId),
            disabled: isConfirming,
            className:
              "p-1 rounded hover:bg-bg-muted transition-colors text-text-tertiary hover:text-accent disabled:opacity-50",
            title: "Подтвердить",
          },
          isConfirming
            ? React.createElement(Loader2, { className: "h-3.5 w-3.5 animate-spin" })
            : React.createElement(Check, { className: "h-3.5 w-3.5" })
        )
      : null
  )
}
