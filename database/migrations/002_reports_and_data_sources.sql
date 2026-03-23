-- ============================================
-- datatable-app: Reports & Data Sources Schema
-- ============================================

-- ============================================
-- 1. Data Sources (SQL-based)
-- ============================================

CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sql_query TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',  -- ParameterDef[], FieldConfig[], WriteMapping, ComputedColumns
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. Report Configs
-- ============================================

CREATE TABLE report_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',  -- ReportConfig or ReportConfigV2
  data_source_id UUID REFERENCES data_sources(id),
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_report_configs_updated_at
  BEFORE UPDATE ON report_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_report_configs_created_by ON report_configs(created_by);
CREATE INDEX idx_report_configs_data_source_id ON report_configs(data_source_id);

-- ============================================
-- 3. Safe Query Execution
-- ============================================

/**
 * Execute a parameterized SQL query safely.
 * Only SELECT statements are allowed.
 * Parameters are passed as JSONB and bound to :param_name placeholders.
 */
CREATE OR REPLACE FUNCTION execute_safe_query(
  p_sql TEXT,
  p_params JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  safe_sql TEXT;
  param_key TEXT;
  param_value TEXT;
BEGIN
  -- Reject DML statements
  safe_sql := upper(trim(p_sql));
  IF safe_sql LIKE 'INSERT%' OR safe_sql LIKE 'UPDATE%' OR safe_sql LIKE 'DELETE%'
     OR safe_sql LIKE 'DROP%' OR safe_sql LIKE 'ALTER%' OR safe_sql LIKE 'TRUNCATE%'
     OR safe_sql LIKE 'CREATE%' OR safe_sql LIKE 'GRANT%' OR safe_sql LIKE 'REVOKE%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Replace :param_name with actual values
  safe_sql := p_sql;
  FOR param_key, param_value IN
    SELECT key, value #>> '{}' FROM jsonb_each(p_params)
  LOOP
    safe_sql := replace(safe_sql, ':' || param_key, quote_literal(param_value));
  END LOOP;

  -- Execute and return as JSON array
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || safe_sql || ') t'
    INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. RLS for Reports and Data Sources
-- ============================================

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_configs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read shared reports
CREATE POLICY report_configs_read ON report_configs
  FOR SELECT USING (
    is_shared = true
    OR created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Data sources readable by authenticated users
CREATE POLICY data_sources_read ON data_sources
  FOR SELECT USING (true);
