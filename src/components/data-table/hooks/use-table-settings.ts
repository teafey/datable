"use client"

import * as React from "react"

export interface TableSettingsState {
  groupingEnabled: boolean
  groupingCollapsed: boolean
  showGroupTotals: boolean
  showTableTotals: boolean
  hiddenColumns: Set<string>
  columnOrder: string[]
  summaryOverrides: Map<string, "sum" | "avg" | "count" | "none">
}

export interface UseTableSettingsOptions {
  settingsId?: string
  groupingEnabled?: boolean
  groupingCollapsed?: boolean
  showGroupTotals?: boolean
  showTableTotals?: boolean
}

interface PersistedSettings {
  groupingEnabled?: boolean
  groupingCollapsed?: boolean
  showGroupTotals?: boolean
  showTableTotals?: boolean
  hiddenColumns?: string[]
  columnOrder?: string[]
  summaryOverrides?: Record<string, "sum" | "avg" | "count" | "none">
}

function loadFromStorage(settingsId: string | undefined): PersistedSettings | null {
  if (!settingsId) return null
  try {
    const raw = localStorage.getItem(`table-settings:${settingsId}`)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSettings
  } catch {
    return null
  }
}

function saveToStorage(settingsId: string | undefined, state: TableSettingsState) {
  if (!settingsId) return
  const data: PersistedSettings = {
    groupingEnabled: state.groupingEnabled,
    groupingCollapsed: state.groupingCollapsed,
    showGroupTotals: state.showGroupTotals,
    showTableTotals: state.showTableTotals,
    hiddenColumns: Array.from(state.hiddenColumns),
    columnOrder: state.columnOrder,
    summaryOverrides: Object.fromEntries(state.summaryOverrides),
  }
  try {
    localStorage.setItem(`table-settings:${settingsId}`, JSON.stringify(data))
  } catch {
    // ignore quota errors
  }
}

export interface UseTableSettingsReturn {
  settings: TableSettingsState
  toggleGrouping: () => void
  toggleGroupCollapsed: () => void
  toggleGroupTotals: () => void
  toggleTableTotals: () => void
  toggleColumn: (key: string) => void
  setSummaryOverride: (key: string, aggregate: "sum" | "avg" | "count" | "none") => void
  moveColumn: (key: string, direction: "up" | "down", allKeys?: string[]) => void
  resetSettings: () => void
  isSettingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  settingsId: string | undefined
}

export function useTableSettings(options: UseTableSettingsOptions = {}): UseTableSettingsReturn {
  const settingsId = options.settingsId

  const [settings, setSettings] = React.useState<TableSettingsState>(() => {
    const defaults: TableSettingsState = {
      groupingEnabled: options.groupingEnabled ?? false,
      groupingCollapsed: options.groupingCollapsed ?? false,
      showGroupTotals: options.showGroupTotals ?? false,
      showTableTotals: options.showTableTotals ?? false,
      hiddenColumns: new Set<string>(),
      columnOrder: [],
      summaryOverrides: new Map<string, "sum" | "avg" | "count" | "none">(),
    }

    const persisted = loadFromStorage(settingsId)
    if (!persisted) return defaults

    return {
      groupingEnabled: persisted.groupingEnabled ?? defaults.groupingEnabled,
      groupingCollapsed: persisted.groupingCollapsed ?? defaults.groupingCollapsed,
      showGroupTotals: persisted.showGroupTotals ?? defaults.showGroupTotals,
      showTableTotals: persisted.showTableTotals ?? defaults.showTableTotals,
      hiddenColumns: new Set(persisted.hiddenColumns ?? []),
      columnOrder: persisted.columnOrder ?? [],
      summaryOverrides: new Map(Object.entries(persisted.summaryOverrides ?? {})),
    }
  })

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  const persist = React.useCallback((state: TableSettingsState) => {
    saveToStorage(settingsId, state)
  }, [settingsId])

  const toggleGrouping = React.useCallback(() => {
    setSettings(s => {
      const next = { ...s, groupingEnabled: !s.groupingEnabled }
      persist(next)
      return next
    })
  }, [persist])

  const toggleGroupCollapsed = React.useCallback(() => {
    setSettings(s => {
      const next = { ...s, groupingCollapsed: !s.groupingCollapsed }
      persist(next)
      return next
    })
  }, [persist])

  const toggleGroupTotals = React.useCallback(() => {
    setSettings(s => {
      const next = { ...s, showGroupTotals: !s.showGroupTotals }
      persist(next)
      return next
    })
  }, [persist])

  const toggleTableTotals = React.useCallback(() => {
    setSettings(s => {
      const next = { ...s, showTableTotals: !s.showTableTotals }
      persist(next)
      return next
    })
  }, [persist])

  const toggleColumn = React.useCallback((key: string) => {
    setSettings(s => {
      const next = new Set(s.hiddenColumns)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      const state = { ...s, hiddenColumns: next }
      persist(state)
      return state
    })
  }, [persist])

  const setSummaryOverride = React.useCallback((key: string, aggregate: "sum" | "avg" | "count" | "none") => {
    setSettings(s => {
      const next = new Map(s.summaryOverrides)
      next.set(key, aggregate)
      const state = { ...s, summaryOverrides: next }
      persist(state)
      return state
    })
  }, [persist])

  const moveColumn = React.useCallback((key: string, direction: "up" | "down", allKeys?: string[]) => {
    setSettings(s => {
      let order = s.columnOrder.length > 0 ? [...s.columnOrder] : (allKeys ? [...allKeys] : [])
      if (order.length === 0) return s
      const idx = order.indexOf(key)
      if (idx === -1) return s
      const swapIdx = direction === "up" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= order.length) return s
      ;[order[idx], order[swapIdx]] = [order[swapIdx], order[idx]]
      const state = { ...s, columnOrder: order }
      persist(state)
      return state
    })
  }, [persist])

  const resetSettings = React.useCallback(() => {
    if (settingsId) {
      try {
        localStorage.removeItem(`table-settings:${settingsId}`)
      } catch {
        // ignore
      }
    }
    setSettings({
      groupingEnabled: options.groupingEnabled ?? false,
      groupingCollapsed: options.groupingCollapsed ?? false,
      showGroupTotals: options.showGroupTotals ?? false,
      showTableTotals: options.showTableTotals ?? false,
      hiddenColumns: new Set<string>(),
      columnOrder: [],
      summaryOverrides: new Map<string, "sum" | "avg" | "count" | "none">(),
    })
  }, [settingsId, options.groupingEnabled, options.groupingCollapsed, options.showGroupTotals, options.showTableTotals])

  const openSettings = React.useCallback(() => setIsSettingsOpen(true), [])
  const closeSettings = React.useCallback(() => setIsSettingsOpen(false), [])

  return {
    settings,
    toggleGrouping,
    toggleGroupCollapsed,
    toggleGroupTotals,
    toggleTableTotals,
    toggleColumn,
    setSummaryOverride,
    moveColumn,
    resetSettings,
    isSettingsOpen,
    openSettings,
    closeSettings,
    settingsId,
  }
}
