"use client"

import * as React from "react"
import { ArrowUp, ArrowDown, RotateCcw } from "lucide-react"
import type { ColumnDef } from "../types"
import type { UseTableSettingsReturn } from "../hooks/use-table-settings"

interface SettingsPanelProps<T> {
  columns: ColumnDef<T>[]
  hasGrouping: boolean
  settings: UseTableSettingsReturn
}

export function SettingsPanel<T>({ columns, hasGrouping, settings }: SettingsPanelProps<T>) {
  const { settings: state, toggleGrouping, toggleGroupCollapsed, toggleGroupTotals, toggleTableTotals, toggleColumn, setSummaryOverride, moveColumn, resetSettings } = settings

  const hideableColumns = columns.filter(col => {
    if (col.hideable === false) return false
    if (col.visible === false) return false
    return true
  })

  const orderedHideableColumns = React.useMemo(() => {
    if (state.columnOrder.length === 0) return hideableColumns
    return [...hideableColumns].sort((a, b) => {
      const ai = state.columnOrder.indexOf(a.key)
      const bi = state.columnOrder.indexOf(b.key)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [hideableColumns, state.columnOrder])

  const summaryColumns = columns.filter(col => col.summary)
  const showSummarySection = summaryColumns.length > 0 && (state.showGroupTotals || state.showTableTotals)

  return (
    <div className="space-y-4 mt-4">
      {/* Группировка */}
      {hasGrouping && (
        <section className="border-b border-border-default pb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Группировка</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={state.groupingEnabled}
                onChange={toggleGrouping}
                className="accent-accent rounded"
              />
              Группировать по отделам
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={state.groupingCollapsed}
                onChange={toggleGroupCollapsed}
                disabled={!state.groupingEnabled}
                className="accent-accent rounded disabled:opacity-50"
              />
              Свёрнуты по умолчанию
            </label>
          </div>
        </section>
      )}

      {/* Итоги */}
      <section className="border-b border-border-default pb-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Итоги</h3>
        <div className="space-y-2">
          {hasGrouping && (
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={state.showGroupTotals}
                onChange={toggleGroupTotals}
                disabled={!state.groupingEnabled}
                className="accent-accent rounded disabled:opacity-50"
              />
              Итоги по группам
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={state.showTableTotals}
              onChange={toggleTableTotals}
              className="accent-accent rounded"
            />
            Общий итог
          </label>
        </div>
      </section>

      {/* Колонки */}
      <section className={showSummarySection ? "border-b border-border-default pb-4" : ""}>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Колонки</h3>
        <div className="space-y-1">
          {orderedHideableColumns.map((col, idx) => (
            <div key={col.key} className="flex items-center gap-2 text-sm text-text-secondary">
              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={!state.hiddenColumns.has(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  className="accent-accent rounded"
                />
                <span className="truncate">{col.label}</span>
              </label>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => moveColumn(col.key, "up", orderedHideableColumns.map(c => c.key))}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-bg-muted disabled:opacity-30 disabled:cursor-default"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveColumn(col.key, "down", orderedHideableColumns.map(c => c.key))}
                  disabled={idx === orderedHideableColumns.length - 1}
                  className="p-0.5 rounded hover:bg-bg-muted disabled:opacity-30 disabled:cursor-default"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Суммаризация */}
      {showSummarySection && (
        <section>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Суммаризация</h3>
          <div className="space-y-3">
            {summaryColumns.map(col => (
              <div key={col.key}>
                <label className="block text-sm text-text-secondary mb-1">{col.label}</label>
                <select
                  className="input text-sm"
                  value={state.summaryOverrides.get(col.key) ?? col.summary!.aggregate}
                  onChange={(e) => setSummaryOverride(col.key, e.target.value as "sum" | "avg" | "count" | "none")}
                >
                  <option value="sum">Сумма</option>
                  <option value="avg">Среднее</option>
                  <option value="count">Кол-во</option>
                  <option value="none">Не показывать</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Сброс */}
      <section className="pt-2">
        <button
          onClick={resetSettings}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Сбросить настройки
        </button>
      </section>
    </div>
  )
}
