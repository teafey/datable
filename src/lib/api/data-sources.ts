"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import {
  getCurrentEmployeeId,
  checkPageAccess,
  getFilteredEmployeeIds,
  getPermissionScope,
  getUserRoleNames,
} from "./permissions"
import type {
  DataSourceConfig,
  FieldConfig,
  ActionDef,
  ReportConfigV2,
  SerializableCellConfig,
} from "@/lib/reports/types"

// --- Constants ---

const SALARY_RESTRICTED_FIELDS = [
  "salary_base",
  "salary_official",
  "salary_unofficial",
  "salary_total",
  "salary_bonus",
  "salary_penalty",
  "advance_amount",
]

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["manager_confirmed"],
  manager_confirmed: ["approved"],
  approved: ["paid"],
  paid: [],
}

// Roles allowed to view/edit salary fields (deny-by-default)
const SALARY_ALLOWED_ROLES = ["admin", "cfo", "cco", "line_manager", "head_manager"]

// Tables allowed for write operations (defense-in-depth)
const ALLOWED_WRITE_TABLES = [
  "monthly_performance",
  "payment_details",
  "employees",
  "position_history",
  "employment_history",
]

// --- Helpers ---

function extractParamNames(sql: string): string[] {
  const names: string[] = []
  // Match :param, but skip PostgreSQL casts like ::date
  const regex = /(^|[^:]):([a-zA-Z_][a-zA-Z0-9_]*)/g

  for (const match of sql.matchAll(regex)) {
    const name = match[2]
    if (!names.includes(name)) {
      names.push(name)
    }
  }

  return names
}

function inferDataType(value: unknown): FieldConfig["dataType"] {
  if (value === null || value === undefined) return "string"
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date"
    return "string"
  }
  if (typeof value === "object") return "json"
  return "string"
}

function getAllowedCellTypes(
  dataType: FieldConfig["dataType"]
): SerializableCellConfig["type"][] {
  switch (dataType) {
    case "number":
      return ["text", "money", "editable"]
    case "boolean":
      return ["boolean", "text"]
    case "date":
      return ["text"]
    case "enum":
      return ["text", "status", "enum"]
    case "string":
      return ["text"]
    default:
      return ["text"]
  }
}

/**
 * Parse SQL FROM/JOIN to detect source tables for columns
 * Example:
 *   SELECT e.id, e.full_name, mp.salary_total
 *   FROM employees e
 *   JOIN monthly_performance mp ON ...
 *
 * Returns:
 *   { "id": "employees", "full_name": "employees", "salary_total": "monthly_performance" }
 */
function detectSourceTables(sqlQuery: string): Record<string, string> {
  const result: Record<string, string> = {}

  // Extract table aliases: FROM employees e → { e: "employees" }
  const aliases: Record<string, string> = {}

  // Match FROM clause
  const fromMatch = sqlQuery.match(/FROM\s+(\w+)\s+(?:AS\s+)?(\w+)/i)
  if (fromMatch) {
    const [, table, alias] = fromMatch
    aliases[alias] = table
  }

  // Match JOIN clauses
  const joinRegex = /JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)/gi
  for (const match of sqlQuery.matchAll(joinRegex)) {
    const [, table, alias] = match
    aliases[alias] = table
  }

  // Parse SELECT columns: e.id → id comes from employees
  const selectMatch = sqlQuery.match(/SELECT\s+([\s\S]*?)\s+FROM/i)
  if (selectMatch) {
    const selectClause = selectMatch[1]
    const columns = selectClause.split(',')

    for (const col of columns) {
      const trimmed = col.trim()

      // Match: alias.column (e.g., "e.id", "mp.salary_total")
      const aliasedMatch = trimmed.match(/(\w+)\.(\w+)(?:\s+AS\s+(\w+))?/i)
      if (aliasedMatch) {
        const [, alias, colName, asName] = aliasedMatch
        const resultName = asName || colName
        const table = aliases[alias]
        if (table) {
          result[resultName] = table
        }
      }
    }
  }

  return result
}

/**
 * Map PostgreSQL data type to FieldConfig dataType
 */
function mapPgTypeToFieldType(pgType: string, udtName?: string): FieldConfig["dataType"] {
  // Numeric types
  if (['smallint', 'int2', 'integer', 'int4', 'bigint', 'int8', 'numeric', 'decimal', 'real', 'float4', 'double precision', 'float8'].includes(pgType)) {
    return "number"
  }

  // Boolean
  if (pgType === 'boolean' || pgType === 'bool') {
    return "boolean"
  }

  // Date/time types
  if (['date', 'timestamp', 'timestamptz', 'timestamp without time zone', 'timestamp with time zone', 'time', 'timetz'].includes(pgType)) {
    return "date"
  }

  // JSON types
  if (['json', 'jsonb'].includes(pgType)) {
    return "json"
  }

  // USER-DEFINED (enums)
  if (pgType === 'USER-DEFINED') {
    return "enum"
  }

  // Default to string for text, varchar, char, uuid, and others
  return "string"
}

/**
 * Fetch PostgreSQL data types for columns using discover_column_types RPC
 * Returns: { "column_name": "integer" | "text" | "timestamp" | ... }
 */
async function fetchPgDataTypes(
  sqlQuery: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}

  try {
    // Call DB function to discover column types from query structure
    const { data, error } = await supabaseAdmin.rpc("discover_column_types", {
      query_text: sqlQuery,
    })

    if (error) {
      console.warn("Failed to discover column types:", error)
      return result
    }

    // RPC returns JSONB array: [{ column_name, data_type, udt_name }, ...]
    if (Array.isArray(data)) {
      for (const col of data) {
        if (col.column_name && col.data_type) {
          result[col.column_name] = col.data_type
        }
      }
    }
  } catch (err) {
    console.warn("Exception discovering column types:", err)
  }

  return result
}

function discoverFieldsFromRows(
  rows: Record<string, unknown>[]
): FieldConfig[] {
  if (rows.length === 0) return []
  const firstRow = rows[0]
  return Object.entries(firstRow).map(([key, value]) => {
    const dataType = inferDataType(value)
    return {
      key,
      label: key,
      pgType: "unknown",
      dataType,
      allowedCellTypes: getAllowedCellTypes(dataType),
      canGroupBy: dataType === "string" || dataType === "enum",
      canEdit: false,
      isPrimaryKey: key === "id",
      visible: !key.endsWith("_id"),
    }
  })
}

function mapRowToDataSourceConfig(row: Record<string, unknown>): DataSourceConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? undefined,
    sqlQuery: row.sql_query as string,
    parameters: (row.parameters ?? []) as DataSourceConfig["parameters"],
    fields: (row.fields ?? []) as DataSourceConfig["fields"],
    writeMapping: (row.write_mapping ?? null) as DataSourceConfig["writeMapping"],
    computedColumns: (row.computed_columns ?? []) as DataSourceConfig["computedColumns"],
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// --- CRUD ---

export async function getDataSources(): Promise<DataSourceConfig[]> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return []

  const isAdmin = await checkPageAccess(employeeId, "manage_roles")
  if (!isAdmin) return []

  const { data, error } = await supabaseAdmin
    .from("data_sources")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching data sources:", error)
    return []
  }

  return (data || []).map(mapRowToDataSourceConfig)
}

export async function getDataSourceById(
  id: string
): Promise<DataSourceConfig | null> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return null

  const [canView, canManage] = await Promise.all([
    checkPageAccess(employeeId, "view_analytics"),
    checkPageAccess(employeeId, "manage_roles"),
  ])
  if (!canView && !canManage) return null

  const { data, error } = await supabaseAdmin
    .from("data_sources")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Error fetching data source:", error)
    return null
  }

  return mapRowToDataSourceConfig(data)
}

export async function createDataSource(
  config: Omit<DataSourceConfig, "id" | "createdAt" | "updatedAt" | "createdBy">
): Promise<{ success: boolean; error?: string; id?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const isAdmin = await checkPageAccess(employeeId, "manage_roles")
  if (!isAdmin)
    return { success: false, error: "Нет прав на создание источников данных" }

  const { data, error } = await supabaseAdmin
    .from("data_sources")
    .insert({
      name: config.name,
      description: config.description || null,
      sql_query: config.sqlQuery,
      parameters: config.parameters as unknown as Record<string, unknown>[],
      fields: config.fields as unknown as Record<string, unknown>[],
      write_mapping: config.writeMapping as unknown as Record<string, unknown> | null,
      computed_columns: config.computedColumns as unknown as Record<string, unknown>[],
      created_by: employeeId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating data source:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reports")
  return { success: true, id: data.id }
}

export async function updateDataSource(
  id: string,
  config: Partial<
    Omit<DataSourceConfig, "id" | "createdAt" | "updatedAt" | "createdBy">
  >
): Promise<{ success: boolean; error?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const isAdmin = await checkPageAccess(employeeId, "manage_roles")
  if (!isAdmin)
    return { success: false, error: "Нет прав на редактирование источников данных" }

  const updateData: Record<string, unknown> = {}
  if (config.name !== undefined) updateData.name = config.name
  if (config.description !== undefined)
    updateData.description = config.description
  if (config.sqlQuery !== undefined) updateData.sql_query = config.sqlQuery
  if (config.parameters !== undefined)
    updateData.parameters = config.parameters as unknown as Record<string, unknown>[]
  if (config.fields !== undefined)
    updateData.fields = config.fields as unknown as Record<string, unknown>[]
  if (config.writeMapping !== undefined)
    updateData.write_mapping = config.writeMapping as unknown as Record<string, unknown> | null
  if (config.computedColumns !== undefined)
    updateData.computed_columns = config.computedColumns as unknown as Record<string, unknown>[]

  const { error } = await supabaseAdmin
    .from("data_sources")
    .update(updateData)
    .eq("id", id)

  if (error) {
    console.error("Error updating data source:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reports")
  return { success: true }
}

export async function deleteDataSource(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const isAdmin = await checkPageAccess(employeeId, "manage_roles")
  if (!isAdmin)
    return { success: false, error: "Нет прав на удаление источников данных" }

  const { error } = await supabaseAdmin
    .from("data_sources")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting data source:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/reports")
  return { success: true }
}

// --- Query Testing ---

const DML_PATTERN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY)\b/i

export async function testDataSourceQuery(
  sqlQuery: string,
  paramValues?: Record<string, string | number>
): Promise<{
  success: boolean
  rows?: Record<string, unknown>[]
  fields?: FieldConfig[]
  error?: string
}> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const isAdmin = await checkPageAccess(employeeId, "manage_roles")
  if (!isAdmin) return { success: false, error: "Нет прав" }

  if (DML_PATTERN.test(sqlQuery)) {
    return { success: false, error: "Запрос содержит запрещённые DML/DDL операции" }
  }

  try {
    // Wrap with LIMIT for safety
    const safeSql = `SELECT * FROM (${sqlQuery}) _test_subquery LIMIT 10`

    // Extract parameter names from SQL and build definitions
    const paramNames = extractParamNames(sqlQuery)
    const paramDefs = paramNames.map((name) => ({
      name,
      label: name,
      type: "string" as const,
      required: false,
    }))
    const paramValuesArr = paramNames.map((name) =>
      String(paramValues?.[name] ?? "")
    )

    // Create temporary data source record
    const { data: tempDs, error: createErr } = await supabaseAdmin
      .from("data_sources")
      .insert({
        name: "__test_temp__",
        sql_query: safeSql,
        parameters: paramDefs as unknown as Record<string, unknown>[],
        fields: [] as unknown as Record<string, unknown>[],
        computed_columns: [] as unknown as Record<string, unknown>[],
        created_by: employeeId,
      })
      .select("id")
      .single()

    if (createErr || !tempDs) {
      return {
        success: false,
        error: createErr?.message ?? "Не удалось создать временный источник",
      }
    }

    try {
      // Execute via safe function (execute_safe_query DB function uses READ ONLY transaction)
      const { data: result, error: execErr } = await supabaseAdmin.rpc(
        "execute_safe_query",
        {
          ds_id: tempDs.id,
          param_values: paramValuesArr,
        }
      )

      if (execErr) return { success: false, error: execErr.message }

      const rows = (result as Record<string, unknown>[]) || []

      // Auto-discover fields from first row
      let fields = discoverFieldsFromRows(rows)

      // Detect source tables from SQL
      const sourceTables = detectSourceTables(sqlQuery)

      // Fetch PostgreSQL types directly from the query
      const pgTypes = await fetchPgDataTypes(sqlQuery)

      // Enrich fields with pgType, dataType, and sourceColumn
      fields = fields.map(f => {
        const pgType = pgTypes[f.key] || "unknown"
        return {
          ...f,
          pgType,
          dataType: pgType !== "unknown" ? mapPgTypeToFieldType(pgType) : f.dataType,
          sourceColumn: sourceTables[f.key]
            ? `${sourceTables[f.key]}.${f.key}`
            : undefined
        }
      })

      return { success: true, rows, fields }
    } finally {
      // Always clean up temp record, even if test fails
      await supabaseAdmin.from("data_sources").delete().eq("id", tempDs.id)
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка выполнения запроса",
    }
  }
}

export async function discoverFieldMetadata(
  sqlQuery: string
): Promise<{
  success: boolean
  fields?: FieldConfig[]
  error?: string
}> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const isAdmin = await checkPageAccess(employeeId, "manage_roles")
  if (!isAdmin) return { success: false, error: "Нет прав" }

  if (DML_PATTERN.test(sqlQuery)) {
    return { success: false, error: "Запрос содержит запрещённые DML/DDL операции" }
  }

  try {
    // LIMIT 1 to get column names/types with minimal data
    const safeSql = `SELECT * FROM (${sqlQuery}) _discover_subquery LIMIT 1`

    // Extract parameter names from SQL
    const paramNames = extractParamNames(sqlQuery)
    const paramDefs = paramNames.map((name) => ({
      name,
      label: name,
      type: "string" as const,
      required: false,
    }))
    // Use empty strings as default param values for discovery
    const paramValuesArr = paramNames.map(() => "")

    // Create temporary data source record
    const { data: tempDs, error: createErr } = await supabaseAdmin
      .from("data_sources")
      .insert({
        name: "__discover_temp__",
        sql_query: safeSql,
        parameters: paramDefs as unknown as Record<string, unknown>[],
        fields: [] as unknown as Record<string, unknown>[],
        computed_columns: [] as unknown as Record<string, unknown>[],
        created_by: employeeId,
      })
      .select("id")
      .single()

    if (createErr || !tempDs) {
      return {
        success: false,
        error: createErr?.message ?? "Не удалось создать временный источник",
      }
    }

    try {
      // Execute via safe function (execute_safe_query DB function uses READ ONLY transaction)
      const { data: result, error: execErr } = await supabaseAdmin.rpc(
        "execute_safe_query",
        {
          ds_id: tempDs.id,
          param_values: paramValuesArr,
        }
      )

      if (execErr) return { success: false, error: execErr.message }

      const rows = (result as Record<string, unknown>[]) || []
      let fields = discoverFieldsFromRows(rows)

      // Detect source tables from SQL
      const sourceTables = detectSourceTables(sqlQuery)

      // Fetch PostgreSQL types directly from the query
      const pgTypes = await fetchPgDataTypes(sqlQuery)

      // Enrich fields with pgType, dataType, and sourceColumn
      fields = fields.map(f => {
        const pgType = pgTypes[f.key] || "unknown"
        return {
          ...f,
          pgType,
          dataType: pgType !== "unknown" ? mapPgTypeToFieldType(pgType) : f.dataType,
          sourceColumn: sourceTables[f.key]
            ? `${sourceTables[f.key]}.${f.key}`
            : undefined
        }
      })

      return { success: true, fields }
    } finally {
      // Always clean up temp record, even if discovery fails
      await supabaseAdmin.from("data_sources").delete().eq("id", tempDs.id)
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка обнаружения полей",
    }
  }
}

// --- Data Fetching ---

export async function fetchDataSourceData(
  dsId: string,
  params?: Record<string, string | number | string[]>
): Promise<{
  success: boolean
  data?: Record<string, unknown>[]
  error?: string
}> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  const hasAccess = await checkPageAccess(employeeId, "view_analytics")
  if (!hasAccess)
    return { success: false, error: "Нет прав на просмотр данных" }

  try {
    // 1. Get data source config
    const { data: dsRow, error: dsErr } = await supabaseAdmin
      .from("data_sources")
      .select("*")
      .eq("id", dsId)
      .single()

    if (dsErr || !dsRow) {
      return {
        success: false,
        error: dsErr?.message ?? "Источник данных не найден",
      }
    }

    const dsConfig = mapRowToDataSourceConfig(dsRow)
    const sqlParamNames = new Set(extractParamNames(dsConfig.sqlQuery))

    // 2. Build param_values array in the order defined by parameters
    const paramValuesArr: string[] = []
    for (const p of dsConfig.parameters) {
      // Handle date-range as compound parameter (_from and _to)
      if (p.type === "date-range") {
        // Check if _from and _to variants are in SQL
        const hasFrom = sqlParamNames.has(`${p.name}_from`)
        const hasTo = sqlParamNames.has(`${p.name}_to`)

        if (hasFrom) {
          const valFrom = params?.[`${p.name}_from`] ?? p.defaultValueFrom
          const isEmptyFrom =
            valFrom === undefined ||
            valFrom === null ||
            (typeof valFrom === "string" && valFrom.trim() === "") ||
            (typeof valFrom === "number" && Number.isNaN(valFrom))

          if (isEmptyFrom) {
            if (p.required) {
              return {
                success: false,
                error: `Заполните обязательный параметр: ${p.label || p.name} (от)`,
              }
            }
            paramValuesArr.push("")
          } else {
            paramValuesArr.push(String(valFrom))
          }
        }

        if (hasTo) {
          const valTo = params?.[`${p.name}_to`] ?? p.defaultValueTo
          const isEmptyTo =
            valTo === undefined ||
            valTo === null ||
            (typeof valTo === "string" && valTo.trim() === "") ||
            (typeof valTo === "number" && Number.isNaN(valTo))

          if (isEmptyTo) {
            if (p.required) {
              return {
                success: false,
                error: `Заполните обязательный параметр: ${p.label || p.name} (до)`,
              }
            }
            paramValuesArr.push("")
          } else {
            paramValuesArr.push(String(valTo))
          }
        }

        continue
      }

      // Keep array index alignment with execute_safe_query (positional mapping),
      // but ignore stale params that are no longer present in SQL.
      if (!sqlParamNames.has(p.name)) {
        paramValuesArr.push("")
        continue
      }

      // Handle multi-select (convert array to comma-separated string)
      if (p.type === "select" && p.multiple && Array.isArray(params?.[p.name])) {
        const arrayVal = params[p.name] as string[]
        if (arrayVal.length === 0) {
          if (p.required) {
            return {
              success: false,
              error: `Заполните обязательный параметр: ${p.label || p.name}`,
            }
          }
          paramValuesArr.push("")
        } else {
          paramValuesArr.push(arrayVal.join(","))
        }
        continue
      }

      const val = params?.[p.name] ?? p.defaultValue
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "") ||
        (typeof val === "number" && Number.isNaN(val))

      if (isEmpty) {
        if (p.required) {
          return {
            success: false,
            error: `Заполните обязательный параметр: ${p.label || p.name}`,
          }
        }
        // Keep positional mapping for optional params
        paramValuesArr.push("")
        continue
      }
      paramValuesArr.push(String(val))
    }

    // 3. Execute the query
    const { data: result, error: execErr } = await supabaseAdmin.rpc(
      "execute_safe_query",
      {
        ds_id: dsId,
        param_values: paramValuesArr,
      }
    )

    if (execErr) return { success: false, error: execErr.message }

    let data = (result as Record<string, unknown>[]) || []

    // 4. Scope filtering: only show employees accessible by scope
    const allowedIds = await getFilteredEmployeeIds(
      employeeId,
      "view_analytics"
    )
    const allowedSet = new Set(allowedIds)

    // 5. Role-based filtering
    const roleNames = await getUserRoleNames(employeeId)
    const hasFullAccess =
      roleNames.includes("admin") ||
      roleNames.includes("cfo") ||
      roleNames.includes("cco")

    // Determine the employee ID column for scope filtering
    // Only use "employee_id" — isPrimaryKey or "id" may refer to non-employee
    // PKs (e.g. performance_id) causing all rows to be filtered out
    const employeeIdField =
      (data.length > 0 && "employee_id" in data[0])
        ? "employee_id"
        : null

    if (employeeIdField && data.length > 0 && !hasFullAccess) {
      data = data.filter((row) => allowedSet.has(row[employeeIdField] as string))
    } else if (!employeeIdField && data.length > 0 && !hasFullAccess) {
      data = []
    }

    // Salary stripping (deny-by-default: only allowed roles can see salary fields)
    const hasSalaryAccess = roleNames.some(r => SALARY_ALLOWED_ROLES.includes(r))

    if (!hasSalaryAccess) {
      // Build restricted keys from both hardcoded list and field config flags
      const restrictedKeys = new Set(SALARY_RESTRICTED_FIELDS)
      if (dsConfig?.fields) {
        for (const f of dsConfig.fields) {
          if (f.restricted) restrictedKeys.add(f.key)
        }
      }

      data = data.map((row) => {
        const filtered = { ...row }
        for (const key of Object.keys(filtered)) {
          if (restrictedKeys.has(key)) delete filtered[key]
        }
        return filtered
      })
    }

    return { success: true, data }
  } catch (err) {
    console.error("Error fetching data source data:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка загрузки данных",
    }
  }
}

// --- Write Operations ---

export async function saveDataSourceField(
  dsId: string,
  pkValue: string,
  field: string,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  // Require at least one write permission for data modification
  const canWrite =
    (await checkPageAccess(employeeId, "edit_team_results")) ||
    (await checkPageAccess(employeeId, "approve_payroll")) ||
    (await checkPageAccess(employeeId, "manage_roles"))
  if (!canWrite) {
    return { success: false, error: "Нет прав на редактирование данных" }
  }

  try {
    // 1. Get data source config
    const { data: dsRow, error: dsErr } = await supabaseAdmin
      .from("data_sources")
      .select("*")
      .eq("id", dsId)
      .single()

    if (dsErr || !dsRow) {
      return {
        success: false,
        error: dsErr?.message ?? "Источник данных не найден",
      }
    }

    const dsConfig = mapRowToDataSourceConfig(dsRow)

    // 2. Check writeMapping exists
    if (!dsConfig.writeMapping) {
      return { success: false, error: "Источник данных не поддерживает запись" }
    }

    const { table, primaryKeyColumn, writableFields } = dsConfig.writeMapping

    // 2a. Validate table is in whitelist (defense-in-depth)
    if (!ALLOWED_WRITE_TABLES.includes(table)) {
      return {
        success: false,
        error: "Таблица не поддерживает запись через этот интерфейс",
      }
    }

    // 3. Verify field is writable
    const dbColumn = writableFields[field]
    if (!dbColumn) {
      return {
        success: false,
        error: `Поле "${field}" не доступно для записи`,
      }
    }

    // 3a. Salary check (deny-by-default: only allowed roles can edit salary fields)
    const roleNames = await getUserRoleNames(employeeId)
    const hasSalaryAccess = roleNames.some(r => SALARY_ALLOWED_ROLES.includes(r))

    if (!hasSalaryAccess) {
      if (SALARY_RESTRICTED_FIELDS.includes(field) || SALARY_RESTRICTED_FIELDS.includes(dbColumn)) {
        return { success: false, error: "Нет прав на редактирование данных по зарплатам" }
      }
    }

    // 3b. Scope check — verify target row is within caller's scope
    // Use write permission scope (not view_analytics) to prevent privilege escalation
    let writePermission = "edit_team_results"
    if (!(await checkPageAccess(employeeId, "edit_team_results"))) {
      if (await checkPageAccess(employeeId, "approve_payroll")) {
        writePermission = "approve_payroll"
      } else if (await checkPageAccess(employeeId, "manage_roles")) {
        writePermission = "manage_roles"
      }
    }

    const scope = await getPermissionScope(employeeId, writePermission)
    let targetRow: Record<string, unknown> | null = null

    if (scope !== "all") {
      const allowedIds = await getFilteredEmployeeIds(employeeId, writePermission)
      const allowedSet = new Set(allowedIds)

      const { data: fetchedRow } = await supabaseAdmin
        .from(table)
        .select("*")
        .eq(primaryKeyColumn, pkValue)
        .single()

      if (!fetchedRow) return { success: false, error: "Запись не найдена" }
      targetRow = fetchedRow as Record<string, unknown>

      const rowEmployeeId = (targetRow.employee_id ?? targetRow[primaryKeyColumn]) as string
      if (!rowEmployeeId || !allowedSet.has(rowEmployeeId)) {
        return { success: false, error: "Нет доступа к этой записи" }
      }
    }

    // 4. Check user role is allowed to edit this field (graceful fallback)
    const fieldConfig = dsConfig.fields.find((f) => f.key === field)

    // If editableByRoles is configured, enforce it
    if (fieldConfig?.editableByRoles?.length) {
      const canEdit = fieldConfig.editableByRoles.some((r) =>
        roleNames.includes(r)
      )
      if (!canEdit) {
        return {
          success: false,
          error: "Нет прав на редактирование этого поля",
        }
      }
    }
    // Otherwise, allow edit (writableFields check already passed in step 3)

    // 5. Check lock rules (reuse targetRow if already fetched)
    if (fieldConfig?.lockRules?.length) {
      if (!targetRow) {
        const { data: fetchedRow } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq(primaryKeyColumn, pkValue)
          .single()
        targetRow = fetchedRow as Record<string, unknown> | null
      }

      if (targetRow) {
        for (const rule of fieldConfig.lockRules) {
          if (
            rule.affectedFields?.length &&
            !rule.affectedFields.includes(field)
          ) {
            continue
          }

          const rowValue = targetRow[rule.field]
          let isLocked = false

          switch (rule.operator) {
            case "eq":
              isLocked = rowValue === rule.value
              break
            case "neq":
              isLocked = rowValue !== rule.value
              break
            case "in":
              isLocked = Array.isArray(rule.value) && rule.value.includes(String(rowValue))
              break
            case "not_in":
              isLocked = Array.isArray(rule.value) && !rule.value.includes(String(rowValue))
              break
          }

          if (isLocked) {
            return {
              success: false,
              error: "Поле заблокировано для редактирования",
            }
          }
        }
      }
    }

    // 6. Status transition validation
    if (table === "monthly_performance" && dbColumn === "status") {
      if (!targetRow) {
        const { data: fetchedRow } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq(primaryKeyColumn, pkValue)
          .single()
        targetRow = fetchedRow as Record<string, unknown> | null
      }
      const currentStatus = targetRow?.status as string
      const validNext = VALID_STATUS_TRANSITIONS[currentStatus]
      if (!validNext?.includes(value as string)) {
        return { success: false, error: "Недопустимый переход статуса" }
      }
    }

    // 7. Execute update
    const { error: updateErr } = await supabaseAdmin
      .from(table)
      .update({ [dbColumn]: value })
      .eq(primaryKeyColumn, pkValue)

    if (updateErr) {
      console.error("Error saving field:", updateErr)
      return { success: false, error: updateErr.message }
    }

    return { success: true }
  } catch (err) {
    console.error("Error in saveDataSourceField:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка сохранения",
    }
  }
}

export async function executeReportAction(
  reportId: string,
  actionKey: string,
  pkValues: string[]
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  const employeeId = await getCurrentEmployeeId()
  if (!employeeId) return { success: false, error: "Не авторизован" }

  try {
    // 1. Load ActionDef from stored report config (never trust client-supplied action)
    const { data: reportRow } = await supabaseAdmin
      .from("report_configs")
      .select("config, data_source_id")
      .eq("id", reportId)
      .single()

    if (!reportRow) return { success: false, error: "Отчёт не найден" }

    const reportConfig = reportRow.config as ReportConfigV2
    const dsId = reportRow.data_source_id as string
    if (!dsId) return { success: false, error: "Отчёт не связан с источником данных" }

    const actionDef = (reportConfig.actions ?? []).find((a: ActionDef) => a.key === actionKey)
    if (!actionDef) return { success: false, error: "Действие не найдено" }

    // 2. Check role is allowed (fail-closed when no roles configured)
    const roleNames = await getUserRoleNames(employeeId)

    if (!actionDef.allowedRoles || actionDef.allowedRoles.length === 0) {
      return {
        success: false,
        error: "Действие не настроено: не указаны разрешённые роли",
      }
    }
    if (!actionDef.allowedRoles.some((r) => roleNames.includes(r))) {
      return { success: false, error: "Нет прав на выполнение действия" }
    }

    // 2a. Salary check (deny-by-default: only allowed roles can modify salary fields)
    const hasSalaryAccess = roleNames.some(r => SALARY_ALLOWED_ROLES.includes(r))

    if (!hasSalaryAccess) {
      if (SALARY_RESTRICTED_FIELDS.includes(actionDef.targetField)) {
        return { success: false, error: "Нет прав на изменение данных по зарплатам" }
      }
    }

    // 3. Get data source config for writeMapping
    const { data: dsRow, error: dsErr } = await supabaseAdmin
      .from("data_sources")
      .select("*")
      .eq("id", dsId)
      .single()

    if (dsErr || !dsRow) {
      return {
        success: false,
        error: dsErr?.message ?? "Источник данных не найден",
      }
    }

    const dsConfig = mapRowToDataSourceConfig(dsRow)

    if (!dsConfig.writeMapping) {
      return { success: false, error: "Источник данных не поддерживает запись" }
    }

    const { table, primaryKeyColumn, writableFields } = dsConfig.writeMapping

    // 3a. Validate table is in whitelist (defense-in-depth)
    if (!ALLOWED_WRITE_TABLES.includes(table)) {
      return {
        success: false,
        error: "Таблица не поддерживает запись через этот интерфейс",
      }
    }

    // 4. Resolve the DB column for the target field
    const dbColumn = writableFields[actionDef.targetField]
    if (!dbColumn) {
      return {
        success: false,
        error: `Поле "${actionDef.targetField}" не доступно для записи`,
      }
    }

    // 5. Scope filtering — only update rows within caller's scope
    // Use write permission scope (not view_analytics) to prevent privilege escalation
    // Map allowed roles to their typical write permissions
    let writePermission = "edit_team_results"
    if (actionDef.allowedRoles.some(r => ["cfo", "cco"].includes(r))) {
      writePermission = "approve_payroll"
    } else if (actionDef.allowedRoles.includes("admin")) {
      writePermission = "manage_roles"
    }

    const scope = await getPermissionScope(employeeId, writePermission)
    let scopedPkValues = pkValues

    if (scope !== "all") {
      const allowedIds = await getFilteredEmployeeIds(employeeId, writePermission)
      const allowedSet = new Set(allowedIds)

      const { data: targetRows } = await supabaseAdmin
        .from(table)
        .select("*")
        .in(primaryKeyColumn, pkValues)

      if (!targetRows?.length) return { success: false, error: "Записи не найдены" }

      scopedPkValues = (targetRows as Record<string, unknown>[])
        .filter((r) => allowedSet.has((r.employee_id ?? r[primaryKeyColumn]) as string))
        .map((r) => r[primaryKeyColumn] as string)

      if (!scopedPkValues.length) return { success: false, error: "Нет доступа к указанным записям" }
    }

    // 6. Status transition validation
    if (table === "monthly_performance" && dbColumn === "status") {
      const { data: currentRows } = await supabaseAdmin
        .from(table)
        .select("*")
        .in(primaryKeyColumn, scopedPkValues)

      const invalidPks = ((currentRows ?? []) as Record<string, unknown>[]).filter(
        (r) =>
          !VALID_STATUS_TRANSITIONS[r.status as string]?.includes(
            actionDef.targetValue as string
          )
      )
      if (invalidPks.length > 0) {
        return {
          success: false,
          error: `Недопустимый переход статуса для ${invalidPks.length} записей`,
        }
      }
    }

    // 7. Execute bulk update
    const { error: updateErr, count } = await supabaseAdmin
      .from(table)
      .update(
        { [dbColumn]: actionDef.targetValue },
        { count: "exact" }
      )
      .in(primaryKeyColumn, scopedPkValues)

    if (updateErr) {
      console.error("Error executing action:", updateErr)
      return { success: false, error: updateErr.message }
    }

    // 7. Revalidate if configured
    if (actionDef.revalidatePath) {
      revalidatePath(actionDef.revalidatePath)
    }

    return { success: true, updatedCount: count ?? scopedPkValues.length }
  } catch (err) {
    console.error("Error in executeReportAction:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка выполнения действия",
    }
  }
}
