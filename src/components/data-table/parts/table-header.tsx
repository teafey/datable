"use client"

import * as React from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ColumnDef } from "../types"

interface TableHeaderProps<T> {
  columns: ColumnDef<T>[]
  sortKey: string | null
  sortDirection: "asc" | "desc" | null
  onSort: (key: string) => void
}

export function TableHeader<T>({ columns, sortKey, sortDirection, onSort }: TableHeaderProps<T>) {
  return (
    <thead className="sticky top-0 z-10 bg-bg-subtle border-b border-border-default">
      <tr>
        {columns.map(col => {
          const isActive = sortKey === col.key
          return (
            <th
              key={col.key}
              className={cn(
                "table-header",
                col.sortable && "cursor-pointer select-none hover:bg-bg-subtle transition-colors",
                col.align === "right" && "text-right",
                col.align === "center" && "text-center"
              )}
              onClick={col.sortable ? () => onSort(col.key) : undefined}
            >
              {col.sortable ? (
                <div className={cn(
                  "inline-flex items-center gap-1",
                  col.align === "right" && "flex-row-reverse"
                )}>
                  <span>{col.label}</span>
                  {isActive ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-4 w-4 opacity-30" />
                  )}
                </div>
              ) : (
                col.label
              )}
            </th>
          )
        })}
      </tr>
    </thead>
  )
}
