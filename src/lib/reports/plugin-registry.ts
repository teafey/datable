import type React from "react"
import type { TableContext } from "@/components/data-table/types"
import type { PluginRegistry } from "./build-columns"

export interface PluginContext {
  pluginProps?: Record<string, unknown>
  [key: string]: unknown
}

export type PluginRenderer = (
  row: Record<string, unknown>,
  ctx: TableContext & { extra?: PluginContext }
) => React.ReactNode

export interface PluginRegistryInstance extends PluginRegistry {
  register: (key: string, renderer: PluginRenderer) => void
  getPlugin: (key: string) => PluginRenderer | undefined
  getAllKeys: () => string[]
}

export function createPluginRegistry(): PluginRegistryInstance {
  const plugins = new Map<string, PluginRenderer>()

  return {
    register(key: string, renderer: PluginRenderer) {
      plugins.set(key, renderer)
    },
    getPlugin(key: string) {
      return plugins.get(key)
    },
    getAllKeys() {
      return Array.from(plugins.keys())
    },
  }
}

// Default singleton registry
export const defaultRegistry: PluginRegistryInstance = createPluginRegistry()

export function registerPlugin(key: string, renderer: PluginRenderer): void {
  defaultRegistry.register(key, renderer)
}

export function getPlugin(key: string): PluginRenderer | undefined {
  return defaultRegistry.getPlugin(key)
}
