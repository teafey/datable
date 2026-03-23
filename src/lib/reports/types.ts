// === Serializable Cell Configs ===
// These types are JSON-serializable (no functions, no React elements, no callbacks)
// They are stored in DB as JSONB and converted to live ColumnDef at render time

export interface SerializableTextCell {
  type: "text"
  field: string
  subtitleField?: string
}

export interface SerializableMoneyCellConfig {
  type: "money"
  field: string
  colorClass?: string
}

export interface SerializablePercentCell {
  type: "percent"
  numeratorField: string
  denominatorField: string
  thresholds?: { value: number; class: string }[]
}

export interface SerializableEditableCell {
  type: "editable"
  field: string
  suffix?: string
  colorClass?: string
}

export interface SerializableStatusCell {
  type: "status"
  field: string
  labels: Record<string, { label: string; class: string }>
}

export interface SerializableBooleanCell {
  type: "boolean"
  field: string
}

export interface SerializablePluginCell {
  type: "plugin"
  pluginKey: string
  props?: Record<string, unknown>
}

export interface SerializableEnumCell {
  type: "enum"
  field: string
  options?: { value: string; label: string }[]
}

export type SerializableCellConfig =
  | SerializableTextCell
  | SerializableMoneyCellConfig
  | SerializablePercentCell
  | SerializableEditableCell
  | SerializableStatusCell
  | SerializableBooleanCell
  | SerializablePluginCell
  | SerializableEnumCell

// === Column Config ===

export interface SerializableColumnConfig {
  key: string
  label: string
  field: string
  width?: string
  minWidth?: string
  align?: "left" | "right" | "center"
  sortable?: boolean
  hideable?: boolean
  cell: SerializableCellConfig
  summary?: {
    aggregate: "sum" | "avg" | "count" | "median" | "min" | "max"
    format?: "money" | "percent" | "number" | "text"
  }
}

// === Data Source Field Metadata ===

export interface FieldDefinition {
  key: string
  label: string
  dataType: "string" | "number" | "boolean" | "date" | "enum"
  allowedCellTypes: SerializableCellConfig["type"][]
  canGroupBy?: boolean
  canEdit?: boolean
  enumValues?: { value: string; label: string }[]
}

// === Data Source ===

export interface DataSourceDefinition {
  key: string
  label: string
  description: string
  fields: FieldDefinition[]
  fetch: (filters?: Record<string, unknown>) => Promise<Record<string, unknown>[]>
}

export interface SerializableDataSource {
  key: string
  label: string
  description: string
  fields: FieldDefinition[]
}

// === Report Config (stored in DB as JSONB) ===

export interface ReportConfig {
  id?: string
  name: string
  description?: string
  dataSourceKey: string
  columns: SerializableColumnConfig[]
  grouping?: {
    enabled: boolean
    field?: string
    fields?: string[]
    defaultCollapsed?: boolean
  }
  totals?: {
    groupTotals?: boolean
    tableTotals?: boolean
    label?: string
    groupLabel?: string
  }
  filters?: Record<string, unknown>
  isShared?: boolean
}

// === Pocket BI v2 Types ===

// --- Parameter Definitions ---

export interface ParameterDef {
  name: string           // "period" (without colon)
  label: string          // "Период"
  type: "date" | "string" | "number" | "select" | "month" | "date-range"
  required: boolean
  defaultValue?: string | number
  defaultValueFrom?: string  // For date-range: default "from" value
  defaultValueTo?: string    // For date-range: default "to" value
  options?: { value: string; label: string }[]
  autoCurrentPeriod?: boolean
  multiple?: boolean     // For multi-select support (OR logic)
}

// --- Field Config (auto from PG + manual overrides) ---

export interface FieldConfig {
  key: string
  label: string
  pgType: string
  dataType: "string" | "number" | "boolean" | "date" | "enum" | "json"
  allowedCellTypes: SerializableCellConfig["type"][]
  canGroupBy?: boolean
  canEdit?: boolean
  enumValues?: { value: string; label: string }[]
  isPrimaryKey?: boolean
  sourceColumn?: string   // table.column (auto from SQL)
  isOverridden?: boolean
  editableByRoles?: string[]
  lockRules?: LockRule[]
  restricted?: boolean
  visible?: boolean       // default true if undefined
}

// --- Write Mapping ---

export interface WriteMapping {
  table: string
  primaryKeyColumn: string
  primaryKeyField: string
  writableFields: Record<string, string>  // result_field → table_column
}

// --- Computed Column ---

export interface ComputedColumnConfig {
  key: string
  label: string
  formula: string
  resultType: "number" | "string" | "boolean"
  dependencies: string[]
  format?: "money" | "percent" | "number"
}

// --- Lock Rules ---

export interface LockRule {
  field: string
  operator: "eq" | "in" | "neq" | "not_in"
  value: string | string[]
  affectedFields?: string[]
}

// --- Action Definitions ---

export interface ActionCondition {
  field: string
  operator: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "is_null" | "is_not_null"
  value?: string | number | boolean | string[]
}

export interface ActionDef {
  key: string
  label: string
  icon?: string
  variant?: "primary" | "secondary" | "danger" | "ghost"
  targetField: string
  targetValue: string | number | boolean
  scope: "row" | "group" | "table"
  visibleWhen?: ActionCondition[]
  disabledWhen?: ActionCondition[]
  rowFilter?: ActionCondition[]
  confirmMessage?: string
  allowedRoles?: string[]
  revalidatePath?: string
}

// --- Data Source Config (stored in data_sources table) ---

export interface DataSourceConfig {
  id: string
  name: string
  description?: string
  sqlQuery: string
  parameters: ParameterDef[]
  fields: FieldConfig[]
  writeMapping: WriteMapping | null
  computedColumns: ComputedColumnConfig[]
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// --- Report Config v2 ---

export interface ReportConfigV2 extends Omit<ReportConfig, 'dataSourceKey'> {
  version: 2
  dataSourceKey?: string
  dataSourceId?: string
  editing?: {
    enabled: boolean
    saveDebounce?: number
    revalidatePath?: string
  }
  lockRules?: LockRule[]
  actions?: ActionDef[]
  computedColumns?: ComputedColumnConfig[]
  defaultParameters?: Record<string, string | number>
  enableDefaultActions?: boolean
}
