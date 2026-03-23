"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PluginRenderer } from "../plugin-registry"

/**
 * Context shape expected by the inline-date plugin.
 */
interface InlineDateContext {
  onDateChange?: (rowId: string, field: string, value: string) => void
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function parseInputDate(input: string): string | null {
  const match = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return null

  const [, dayStr, monthStr, yearStr] = match
  const day = parseInt(dayStr, 10)
  const month = parseInt(monthStr, 10)
  const year = parseInt(yearStr, 10)

  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return `${year}-${monthStr}-${dayStr}`
}

/**
 * Renders an inline date editor with DD.MM.YYYY mask.
 * Toggles between display and edit mode on click.
 *
 * Expected props (from SerializablePluginCell.props):
 *  - field: string     — the row field containing the date value
 *  - placeholder?: string
 *
 * Expected row fields:
 *  - id: string
 *  - [field]: string | null (ISO date string)
 *
 * Expected ctx:
 *  - extra.onDateChange?(rowId, field, isoValue)
 */
export function createInlineDateRenderer(
  props?: Record<string, unknown>
): PluginRenderer {
  const field = (props?.field as string) ?? "date"
  const placeholder = (props?.placeholder as string) ?? "\u2014"

  const renderer: PluginRenderer = (row, ctx) => {
    const rowId = row.id as string
    const currentValue = (row[field] as string | null) ?? null
    const extra = ctx.extra as unknown as InlineDateContext | undefined

    return React.createElement(InlineDateCell, {
      value: currentValue,
      placeholder,
      onChange: (newValue: string) => {
        extra?.onDateChange?.(rowId, field, newValue)
      },
    })
  }
  return renderer
}

/**
 * Internal component: inline date editor with DD.MM.YYYY mask.
 */
function InlineDateCell({
  value,
  placeholder,
  onChange,
}: {
  value: string | null
  placeholder: string
  onChange: (value: string) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [hasError, setHasError] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setInputValue(value ? formatDisplayDate(value) : "")
    setHasError(false)
    setIsEditing(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 8)

    if (val.length >= 5) {
      val = val.slice(0, 2) + "." + val.slice(2, 4) + "." + val.slice(4)
    } else if (val.length >= 3) {
      val = val.slice(0, 2) + "." + val.slice(2)
    }

    setInputValue(val)
    setHasError(false)
  }

  const handleSave = () => {
    if (!inputValue) {
      setIsEditing(false)
      return
    }
    const parsed = parseInputDate(inputValue)
    if (parsed) {
      if (parsed !== value) {
        onChange(parsed)
      }
      setIsEditing(false)
    } else {
      setHasError(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") setIsEditing(false)
  }

  if (isEditing) {
    return React.createElement("input", {
      ref: inputRef,
      type: "text",
      value: inputValue,
      placeholder: "ДД.ММ.ГГГГ",
      onChange: handleInputChange,
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      className: cn(
        "w-24 bg-transparent outline-none border-b text-sm text-center",
        hasError ? "border-error text-error" : "border-accent"
      ),
    })
  }

  return React.createElement(
    "span",
    {
      onClick: handleStartEdit,
      className: "cursor-pointer hover:text-accent transition-colors text-sm",
    },
    value
      ? formatDisplayDate(value)
      : React.createElement(
          "span",
          { className: "text-text-disabled" },
          placeholder
        )
  )
}

/**
 * Default renderer registered with default props (field="date").
 */
export const inlineDateRenderer: PluginRenderer = (row, ctx) => {
  return createInlineDateRenderer()(row, ctx)
}
