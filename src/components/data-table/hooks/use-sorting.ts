"use client"

import * as React from "react"

type SortDirection = "asc" | "desc" | null

interface UseSortingReturn<T> {
  sortKey: string | null
  sortDirection: SortDirection
  handleSort: (key: string) => void
  sortData: (data: T[], columns: { key: string; sortable?: boolean; sortValue?: (row: T) => string | number | null }[]) => T[]
}

export function useSorting<T>(): UseSortingReturn<T> {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)

  const handleSort = React.useCallback((key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }, [sortKey, sortDirection])

  const sortData = React.useCallback((data: T[], columns: { key: string; sortable?: boolean; sortValue?: (row: T) => string | number | null }[]): T[] => {
    if (!sortKey || !sortDirection) return data

    const column = columns.find(c => c.key === sortKey)
    if (!column?.sortable) return data

    const getValue = column.sortValue
    if (!getValue) return data

    return [...data].sort((a, b) => {
      const aValue = getValue(a)
      const bValue = getValue(b)

      if (aValue === null && bValue === null) return 0
      if (aValue === null) return sortDirection === "asc" ? 1 : -1
      if (bValue === null) return sortDirection === "asc" ? -1 : 1

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue, "ru")
          : bValue.localeCompare(aValue, "ru")
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }, [sortKey, sortDirection])

  return { sortKey, sortDirection, handleSort, sortData }
}
