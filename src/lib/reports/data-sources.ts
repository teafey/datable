import type { DataSourceDefinition, FieldDefinition } from "./types"

/**
 * Legacy TypeScript-based data source registry.
 *
 * For new reports, use SQL-based data sources (data_sources table)
 * which are managed through the Report Builder admin UI.
 *
 * This registry is kept for backward compatibility and can be used
 * to register custom TypeScript data sources programmatically.
 */

const dataSources: Record<string, DataSourceDefinition> = {}

export function registerDataSource(source: DataSourceDefinition): void {
  dataSources[source.key] = source
}

export function getDataSource(key: string): DataSourceDefinition | undefined {
  return dataSources[key]
}

export function getAllDataSources(): DataSourceDefinition[] {
  return Object.values(dataSources)
}

export function getDataSourceFields(key: string): FieldDefinition[] {
  return dataSources[key]?.fields || []
}
