"use client"

import * as React from "react"
import type { ComputedField } from "../types"

interface UseTableStateOptions<T> {
  initialData: T[]
  getRowKey: (row: T) => string
  computedFields?: ComputedField<T>[]
  onSave?: (row: T, changedFields: (keyof T)[]) => Promise<void>
  saveDebounce?: number
}

interface UseTableStateReturn<T> {
  data: T[]
  updateField: (rowKey: string, field: keyof T, value: unknown) => void
  pendingSaves: Set<string>
  loadingActions: Map<string, Set<string>>
  setActionLoading: (rowKey: string, actionKey: string, loading: boolean) => void
}

export function useTableState<T>({
  initialData,
  getRowKey,
  computedFields,
  onSave,
  saveDebounce = 500,
}: UseTableStateOptions<T>): UseTableStateReturn<T> {
  const [data, setData] = React.useState(initialData)
  const [pendingSaves, setPendingSaves] = React.useState<Set<string>>(new Set())
  const [loadingActions, setLoadingActions] = React.useState<Map<string, Set<string>>>(new Map())

  const pendingRef = React.useRef<Map<string, Partial<T>>>(new Map())
  const timersRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map())
  const dataRef = React.useRef(data)
  dataRef.current = data

  // Sync with new server data (after revalidatePath)
  React.useEffect(() => {
    setData(initialData.map(serverRow => {
      const key = getRowKey(serverRow)
      const pending = pendingRef.current.get(key)
      return pending ? { ...serverRow, ...pending } : serverRow
    }))
  }, [initialData, getRowKey])

  // Cleanup timers on unmount
  React.useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const updateField = React.useCallback((rowKey: string, field: keyof T, value: unknown) => {
    // 1. Optimistic update
    setData(prev => prev.map(row => {
      if (getRowKey(row) !== rowKey) return row
      const updated = { ...row, [field]: value }

      // 2. Recompute dependent fields
      computedFields?.forEach(cf => {
        if (cf.dependencies.includes(field as keyof T)) {
          (updated as Record<string, unknown>)[cf.field as string] = cf.compute(updated)
        }
      })

      return updated
    }))

    // 3. Track pending change
    const existing = pendingRef.current.get(rowKey) || {} as Partial<T>
    pendingRef.current.set(rowKey, { ...existing, [field]: value })

    // 4. Mark as pending save
    setPendingSaves(prev => new Set(prev).add(rowKey))

    // 5. Debounce PER ROW
    const existingTimer = timersRef.current.get(rowKey)
    if (existingTimer) clearTimeout(existingTimer)

    if (onSave) {
      timersRef.current.set(rowKey, setTimeout(async () => {
        const currentRow = dataRef.current.find(r => getRowKey(r) === rowKey)
        if (!currentRow) return

        const changedFields = Object.keys(pendingRef.current.get(rowKey) || {}) as (keyof T)[]
        pendingRef.current.delete(rowKey)
        timersRef.current.delete(rowKey)

        try {
          await onSave(currentRow, changedFields)
        } finally {
          setPendingSaves(prev => {
            const next = new Set(prev)
            next.delete(rowKey)
            return next
          })
        }
      }, saveDebounce))
    }
  }, [getRowKey, computedFields, onSave, saveDebounce])

  const setActionLoading = React.useCallback((rowKey: string, actionKey: string, loading: boolean) => {
    setLoadingActions(prev => {
      const next = new Map(prev)
      const rowActions = new Set(next.get(rowKey) || [])
      if (loading) {
        rowActions.add(actionKey)
      } else {
        rowActions.delete(actionKey)
      }
      if (rowActions.size === 0) {
        next.delete(rowKey)
      } else {
        next.set(rowKey, rowActions)
      }
      return next
    })
  }, [])

  return { data, updateField, pendingSaves, loadingActions, setActionLoading }
}
