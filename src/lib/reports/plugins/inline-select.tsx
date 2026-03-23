"use client"

import * as React from "react"
import type { PluginRenderer } from "../plugin-registry"

/**
 * Context shape expected by the inline-select plugin.
 */
interface InlineSelectContext {
  onFieldChange?: (rowId: string, field: string, value: string) => void
}

/**
 * Renders an inline select dropdown that toggles between display and edit mode on click.
 *
 * Expected props (from SerializablePluginCell.props):
 *  - field: string      — the row field to display/edit
 *  - options: { value: string; label: string }[]
 *  - emptyLabel?: string
 *
 * Expected row fields:
 *  - id: string
 *  - [field]: string (current value)
 *
 * Expected ctx:
 *  - extra.onFieldChange?(rowId, field, value)
 */
export function createInlineSelectRenderer(
  props?: Record<string, unknown>
): PluginRenderer {
  const field = (props?.field as string) ?? ""
  const options = (props?.options as { value: string; label: string }[]) ?? []
  const emptyLabel = (props?.emptyLabel as string) ?? "\u2014"

  const renderer: PluginRenderer = (row, ctx) => {
    const rowId = row.id as string
    const currentValue = (row[field] as string) ?? ""
    const extra = ctx.extra as InlineSelectContext | undefined

    return React.createElement(InlineSelectCell, {
      _rowId: rowId,
      _field: field,
      value: currentValue,
      options,
      emptyLabel,
      onChange: (newValue: string) => {
        extra?.onFieldChange?.(rowId, field, newValue)
      },
    })
  }
  return renderer
}

/**
 * Internal component: toggles between text display and select dropdown.
 */
function InlineSelectCell({
  _rowId,
  _field,
  value,
  options,
  emptyLabel,
  onChange,
}: {
  _rowId: string
  _field: string
  value: string
  options: { value: string; label: string }[]
  emptyLabel: string
  onChange: (value: string) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const selectRef = React.useRef<HTMLSelectElement>(null)

  React.useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus()
    }
  }, [isEditing])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
    setIsEditing(false)
  }

  if (isEditing) {
    return React.createElement(
      "select",
      {
        ref: selectRef,
        value,
        onChange: handleChange,
        onBlur: () => setIsEditing(false),
        className:
          "w-full bg-transparent outline-none border-b border-accent cursor-pointer",
      },
      React.createElement("option", { value: "" }, emptyLabel),
      ...options.map((opt) =>
        React.createElement("option", { key: opt.value, value: opt.value }, opt.label)
      )
    )
  }

  const displayLabel = options.find((o) => o.value === value)?.label ?? value

  return React.createElement(
    "span",
    {
      onClick: () => setIsEditing(true),
      className: "cursor-pointer hover:text-accent transition-colors",
    },
    displayLabel || React.createElement("span", { className: "text-text-disabled" }, emptyLabel)
  )
}

/**
 * Default renderer registered with static empty props.
 * For actual use, the plugin is typically created via createInlineSelectRenderer(props).
 */
export const inlineSelectRenderer: PluginRenderer = (row, ctx) => {
  // When used via the plugin registry with SerializablePluginCell,
  // build-columns passes props through the plugin cell config.
  // This default renderer works without props for basic cases.
  return createInlineSelectRenderer()(row, ctx)
}
