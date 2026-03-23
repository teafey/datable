"use client"

import * as React from "react"
import { Settings } from "lucide-react"
import { EditableCellProvider } from "@/components/ui/editable-cell"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useGroupByDepartmentTree, useGroupByField, useGroupByMultiField } from "@/hooks/use-group-by-department-tree"
import type { DataTableProps, TableContext } from "./types"
import { useTableState } from "./hooks/use-table-state"
import { useSorting } from "./hooks/use-sorting"
import { useColumnVisibility } from "./hooks/use-column-visibility"
import { useTableSettings } from "./hooks/use-table-settings"
import { TableHeader } from "./parts/table-header"
import { DataRow } from "./parts/data-row"
import { GroupSection } from "./parts/group-section"
import { GrandTotalRow } from "./parts/grand-total-row"
import { SettingsPanel } from "./parts/settings-panel"
import { EmptyState } from "./parts/empty-state"

export function DataTable<T, TExtra = {}>({
  initialData,
  getRowKey,
  columns,
  computedFields,
  context,
  grouping,
  totals,
  footer,
  onSave,
  saveDebounce,
  emptyMessage,
  settings,
}: DataTableProps<T, TExtra>) {
  const { data, updateField, pendingSaves, loadingActions, setActionLoading } = useTableState({
    initialData,
    getRowKey,
    computedFields,
    onSave,
    saveDebounce,
  })

  // Suppress unused variable warning — pendingSaves available for future use
  void pendingSaves

  // Base context for sub-components that use TableContext without TExtra generic
  const baseCtx = context as unknown as TableContext

  const { sortKey, sortDirection, handleSort, sortData } = useSorting<T>()
  const visibleColumns = useColumnVisibility(columns, baseCtx)

  const settingsId = typeof settings === "string" ? settings : undefined

  const tableSettings = useTableSettings({
    settingsId,
    groupingEnabled: grouping?.enabled ?? false,
    groupingCollapsed: grouping?.defaultCollapsed ?? false,
    showGroupTotals: totals?.groupTotals ?? false,
    showTableTotals: totals?.tableTotals ?? false,
  })

  // Apply settings overrides
  const effectiveGrouping = settings && grouping ? {
    ...grouping,
    enabled: tableSettings.settings.groupingEnabled,
    defaultCollapsed: tableSettings.settings.groupingCollapsed,
  } : grouping

  const effectiveShowGroupTotals = settings
    ? tableSettings.settings.showGroupTotals
    : (totals?.groupTotals ?? false)

  const effectiveShowTableTotals = settings
    ? tableSettings.settings.showTableTotals
    : (totals?.tableTotals ?? false)

  // Filter columns based on settings hiddenColumns
  const settingsVisibleColumns = React.useMemo(() => {
    if (!settings) return visibleColumns
    return visibleColumns.filter(col => !tableSettings.settings.hiddenColumns.has(col.key))
  }, [settings, visibleColumns, tableSettings.settings.hiddenColumns])

  // Apply summary overrides and column ordering
  const { summaryOverrides, columnOrder } = tableSettings.settings
  const finalColumns = React.useMemo(() => {
    let cols = settingsVisibleColumns
    if (settings && summaryOverrides.size > 0) {
      cols = cols.map(col => {
        const override = summaryOverrides.get(col.key)
        if (!override || !col.summary) return col
        if (override === "none") return { ...col, summary: undefined }
        return { ...col, summary: { ...col.summary, aggregate: override as "sum" | "avg" | "count" | "custom" } }
      })
    }
    if (settings && columnOrder.length > 0) {
      cols = [...cols].sort((a, b) => {
        const ai = columnOrder.indexOf(a.key)
        const bi = columnOrder.indexOf(b.key)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    }
    return cols
  }, [settings, settingsVisibleColumns, summaryOverrides, columnOrder])

  const sortedData = React.useMemo(
    () => sortData(data, finalColumns),
    [sortData, data, finalColumns]
  )

  const tableMinWidth = React.useMemo(() => {
    let total = 0
    for (const col of finalColumns) {
      if (col.width && col.width !== "auto") {
        total += parseInt(col.width, 10) || 0
      } else {
        total += 150
      }
    }
    return `${total}px`
  }, [finalColumns])

  const isFlat = effectiveGrouping?.mode === "flat"
  const isMultiField = effectiveGrouping?.fields && effectiveGrouping.fields.length > 1

  const departmentResult = useGroupByDepartmentTree(
    sortedData,
    effectiveGrouping?.getDepartmentId ?? (() => null),
    effectiveGrouping?.hierarchy ?? [],
    (effectiveGrouping?.enabled && !isFlat && !isMultiField) ?? false,
    { defaultCollapsed: effectiveGrouping?.defaultCollapsed }
  )

  const flatResult = useGroupByField(
    sortedData,
    effectiveGrouping?.getDepartmentId ?? (() => null),
    (effectiveGrouping?.enabled && isFlat && !isMultiField) ?? false,
    { defaultCollapsed: effectiveGrouping?.defaultCollapsed },
    effectiveGrouping?.getGroupLabel
  )

  // Multi-field hierarchical grouping
  const multiFieldGetters = React.useMemo(() => {
    if (!effectiveGrouping?.fields || !effectiveGrouping?.getGroupKey) return []
    return effectiveGrouping.fields.map((_, level) => (row: T) => effectiveGrouping.getGroupKey!(row, level))
  }, [effectiveGrouping?.fields, effectiveGrouping?.getGroupKey])

  const multiFieldResult = useGroupByMultiField(
    sortedData,
    multiFieldGetters,
    (effectiveGrouping?.enabled && isMultiField) ?? false,
    { defaultCollapsed: effectiveGrouping?.defaultCollapsed },
    effectiveGrouping?.getGroupLabel
  )

  const { tree, collapsedNodes, toggleNode } = isMultiField
    ? multiFieldResult
    : isFlat
    ? flatResult
    : departmentResult

  const handleFieldChange = React.useCallback((rowKey: string, field: keyof T, value: number | null) => {
    updateField(rowKey, field, value)
  }, [updateField])

  return (
    <div className="flex flex-col h-full bg-bg-base border border-border-default rounded-md overflow-hidden">
      {settings && (
        <div className="flex justify-end px-2 py-1.5">
          <button
            onClick={tableSettings.openSettings}
            className="p-1.5 rounded hover:bg-bg-muted"
            title="Настройки таблицы"
          >
            <Settings className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>
      )}
      <div className="table-scroll">
        <table className="w-full" style={{ tableLayout: "fixed", minWidth: tableMinWidth }}>
          <colgroup>
            {finalColumns.map(col => (
              <col key={col.key} style={{ width: col.width, minWidth: col.minWidth }} />
            ))}
          </colgroup>

          <TableHeader
            columns={finalColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          {sortedData.length === 0 ? (
            <tbody>
              <EmptyState colSpan={finalColumns.length} message={emptyMessage} />
            </tbody>
          ) : effectiveGrouping?.enabled ? (
            tree.map(group => (
              <EditableCellProvider key={group.departmentId}>
                <tbody>
                  <GroupSection
                    group={group}
                    columns={finalColumns}
                    ctx={baseCtx}
                    getRowKey={getRowKey}
                    collapsedNodes={collapsedNodes}
                    onToggle={toggleNode}
                    grouping={effectiveGrouping}
                    showGroupTotals={effectiveShowGroupTotals}
                    groupLabel={totals?.groupLabel}
                    onFieldChange={handleFieldChange}
                    loadingActions={loadingActions}
                    setActionLoading={setActionLoading}
                  />
                </tbody>
              </EditableCellProvider>
            ))
          ) : (
            <EditableCellProvider>
              <tbody>
                {sortedData.map(row => (
                  <DataRow
                    key={getRowKey(row)}
                    row={row}
                    rowKey={getRowKey(row)}
                    columns={finalColumns}
                    ctx={baseCtx}
                    onFieldChange={handleFieldChange}
                    loadingActions={loadingActions}
                    setActionLoading={setActionLoading}
                  />
                ))}
              </tbody>
            </EditableCellProvider>
          )}

          {effectiveShowTableTotals && sortedData.length > 0 && (
            <tfoot className="sticky bottom-0 z-10 bg-bg-subtle border-t border-border-default font-semibold">
              <GrandTotalRow data={sortedData} columns={finalColumns} label={totals?.label} />
            </tfoot>
          )}
        </table>
      </div>

      {footer && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-default bg-bg-subtle">
          {footer.left?.(data, context)}
          {footer.right?.(data, context)}
        </div>
      )}

      {settings && (
        <Sheet open={tableSettings.isSettingsOpen} onOpenChange={(open) => !open && tableSettings.closeSettings()}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Настройки таблицы</SheetTitle>
            </SheetHeader>
            <SettingsPanel
              columns={visibleColumns}
              hasGrouping={!!grouping}
              settings={tableSettings}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
