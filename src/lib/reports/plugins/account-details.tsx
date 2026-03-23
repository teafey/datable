"use client"

import * as React from "react"
import { Check, Copy, AlertTriangle, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PluginRenderer } from "../plugin-registry"

/**
 * Context shape expected by the account-details plugin (optional).
 * If not provided, plugin will use built-in state management.
 */
interface AccountDetailsContext {
  revealedAccounts?: Set<string>
  copiedId?: string | null
  onToggleRevealAccount?: (employeeId: string) => void
  onCopyToClipboard?: (row: Record<string, unknown>) => void
}

function formatAccountNumber(account: string, revealed: boolean): string {
  if (revealed) return account
  if (account.length <= 4) return account
  return `${"*".repeat(Math.max(0, account.length - 4))} ${account.slice(-4)}`
}

/**
 * Internal component with state for out-of-box functionality
 */
function AccountDetailsCell({ row, ctx }: { row: Record<string, unknown>; ctx: any }) {
  const [isRevealed, setIsRevealed] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)

  const employeeId = row.id as string
  const paymentDetails = row.paymentDetails as
    | { bankName?: string; accountNumber: string }
    | null
    | undefined
  const extra = ctx.extra as unknown as AccountDetailsContext | undefined

  // Use context state if available, otherwise use local state
  const revealed = extra?.revealedAccounts?.has(employeeId) ?? isRevealed
  const copied = extra?.copiedId === employeeId || isCopied

  const handleToggleReveal = () => {
    if (extra?.onToggleRevealAccount) {
      extra.onToggleRevealAccount(employeeId)
    } else {
      setIsRevealed(!isRevealed)
    }
  }

  const handleCopy = async () => {
    if (extra?.onCopyToClipboard) {
      extra.onCopyToClipboard(row)
    } else {
      // Built-in copy functionality
      const textToCopy = `${paymentDetails?.bankName || "Банк"}: ${paymentDetails?.accountNumber || ""}`

      try {
        await navigator.clipboard.writeText(textToCopy)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (error) {
        // Fallback for older browsers
        const textarea = document.createElement("textarea")
        textarea.value = textToCopy
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand("copy")
          setIsCopied(true)
          setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
          console.error("Failed to copy:", err)
        }
        document.body.removeChild(textarea)
      }
    }
  }

  if (!paymentDetails) {
    return (
      <div className="flex items-center gap-1 text-warning">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">Не указаны</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Account number with reveal toggle */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-text-tertiary">{paymentDetails.bankName || "Банк"}</span>
        <span className="text-sm text-text-primary tabular-nums">
          {formatAccountNumber(paymentDetails.accountNumber, revealed)}
        </span>
        <button
          onClick={handleToggleReveal}
          className="p-1 rounded hover:bg-bg-muted transition-colors"
          title={revealed ? "Скрыть" : "Показать"}
          type="button"
        >
          {revealed ? (
            <EyeOff className="h-3 w-3 text-text-tertiary" />
          ) : (
            <Eye className="h-3 w-3 text-text-tertiary" />
          )}
        </button>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={cn(
          "p-1 rounded hover:bg-bg-muted transition-colors",
          copied && "text-success"
        )}
        title={copied ? "Скопировано!" : "Копировать реквизиты"}
        type="button"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4 text-text-tertiary" />
        )}
      </button>
    </div>
  )
}

/**
 * Renders a masked account number with reveal and copy buttons.
 *
 * **Default row actions (out-of-box):**
 * - Click eye icon: toggle reveal/hide account number
 * - Click copy icon: copy payment details to clipboard + show "Скопировано" toast
 *
 * Works without any context configuration!
 *
 * Expected row fields:
 *  - id: string (employee id)
 *  - paymentDetails: { bankName?: string; accountNumber: string } | null
 *
 * Optional ctx (for coordinated state):
 *  - extra.revealedAccounts: Set<string>
 *  - extra.copiedId: string | null
 *  - extra.onToggleRevealAccount(employeeId)
 *  - extra.onCopyToClipboard(row)
 */
export const accountDetailsRenderer: PluginRenderer = (row, ctx) => {
  return React.createElement(AccountDetailsCell, { row, ctx })
}
