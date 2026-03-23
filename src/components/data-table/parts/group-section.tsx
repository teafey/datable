"use client"

import * as React from "react"
import type { DepartmentTreeGroup } from "@/hooks/use-group-by-department-tree"
import type { ColumnDef, GroupingConfig, TableContext } from "../types"
import { GroupHeaderRow } from "./group-header-row"
import { GroupFooterRow } from "./group-footer-row"
import { DataRow } from "./data-row"

interface GroupSectionProps<T> {
  group: DepartmentTreeGroup<T>
  columns: ColumnDef<T>[]
  ctx: TableContext
  getRowKey: (row: T) => string
  collapsedNodes: Set<string>
  onToggle: (id: string) => void
  grouping: GroupingConfig<T>
  showGroupTotals: boolean
  groupLabel?: string
  onFieldChange: (rowKey: string, field: keyof T, value: number | null) => void
  loadingActions: Map<string, Set<string>>
  setActionLoading: (rowKey: string, actionKey: string, loading: boolean) => void
}

function getAllDescendantItems<T>(group: DepartmentTreeGroup<T>): T[] {
  let items = [...group.items]
  for (const child of group.children) {
    items = items.concat(getAllDescendantItems(child))
  }
  return items
}

export function GroupSection<T>({
  group,
  columns,
  ctx,
  getRowKey,
  collapsedNodes,
  onToggle,
  grouping,
  showGroupTotals,
  groupLabel,
  onFieldChange,
  loadingActions,
  setActionLoading,
}: GroupSectionProps<T>) {
  const isCollapsed = collapsedNodes.has(group.departmentId)
  const allDescendants = React.useMemo(() => getAllDescendantItems(group), [group])
  const headerSummary = grouping.headerSummary?.(group.items, allDescendants)

  return (
    <>
      <GroupHeaderRow
        name={group.departmentName}
        count={group.totalCount}
        level={group.level}
        managerNames={group.managerNames}
        isCollapsed={isCollapsed}
        onToggle={() => onToggle(group.departmentId)}
        colSpan={columns.length}
        headerSummary={headerSummary}
        actions={grouping.actions}
        items={allDescendants}
        ctx={ctx}
        departmentId={group.departmentId}
      />

      {!isCollapsed && (
        <>
          {group.items.map(row => (
            <DataRow
              key={getRowKey(row)}
              row={row}
              rowKey={getRowKey(row)}
              columns={columns}
              ctx={ctx}
              onFieldChange={onFieldChange}
              loadingActions={loadingActions}
              setActionLoading={setActionLoading}
            />
          ))}

          {group.children.map(child => (
            <GroupSection
              key={child.departmentId}
              group={child}
              columns={columns}
              ctx={ctx}
              getRowKey={getRowKey}
              collapsedNodes={collapsedNodes}
              onToggle={onToggle}
              grouping={grouping}
              showGroupTotals={showGroupTotals}
              groupLabel={groupLabel}
              onFieldChange={onFieldChange}
              loadingActions={loadingActions}
              setActionLoading={setActionLoading}
            />
          ))}

          {showGroupTotals && (
            <GroupFooterRow items={allDescendants} columns={columns} label={groupLabel} />
          )}
        </>
      )}
    </>
  )
}
