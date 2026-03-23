-- ============================================
-- datatable-app: Generic Users & RBAC Schema
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Users
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE,          -- Link to Supabase Auth (auth.users.id)
  full_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. Roles
-- ============================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,  -- System roles cannot be deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default roles
INSERT INTO roles (role_name, description, is_system) VALUES
  ('admin', 'Full system access', true),
  ('editor', 'Can edit data and reports', false),
  ('viewer', 'Read-only access', false);

-- ============================================
-- 3. User Roles
-- ============================================

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ============================================
-- 4. Permissions
-- ============================================

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT,     -- e.g. "reports", "users", "data_sources"
  action TEXT        -- e.g. "view", "edit", "delete", "approve"
);

-- Default permissions
INSERT INTO permissions (permission_key, description, resource, action) VALUES
  ('view_reports', 'View reports', 'reports', 'view'),
  ('edit_reports', 'Create and edit reports', 'reports', 'edit'),
  ('delete_reports', 'Delete reports', 'reports', 'delete'),
  ('view_data_sources', 'View data sources', 'data_sources', 'view'),
  ('edit_data_sources', 'Create and edit data sources', 'data_sources', 'edit'),
  ('manage_users', 'Manage users and roles', 'users', 'manage'),
  ('manage_roles', 'Manage roles and permissions', 'roles', 'manage'),
  ('approve_data', 'Approve/lock data', 'data', 'approve'),
  ('export_data', 'Export data', 'data', 'export');

-- ============================================
-- 5. Role Permissions
-- ============================================

CREATE TYPE permission_scope AS ENUM ('own', 'team', 'department', 'city', 'all');

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(permission_key) ON DELETE CASCADE,
  scope permission_scope NOT NULL DEFAULT 'own',
  UNIQUE(role_id, permission_key)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);

-- Admin gets all permissions with "all" scope
INSERT INTO role_permissions (role_id, permission_key, scope)
SELECT r.id, p.permission_key, 'all'::permission_scope
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'admin';

-- Editor gets view + edit permissions
INSERT INTO role_permissions (role_id, permission_key, scope)
SELECT r.id, p.permission_key, 'all'::permission_scope
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'editor'
  AND p.permission_key IN ('view_reports', 'edit_reports', 'view_data_sources', 'export_data');

-- Viewer gets view permissions
INSERT INTO role_permissions (role_id, permission_key, scope)
SELECT r.id, p.permission_key, 'all'::permission_scope
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'viewer'
  AND p.permission_key IN ('view_reports', 'view_data_sources');

-- ============================================
-- 6. Invitations
-- ============================================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Optional: pre-link to user
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);

-- ============================================
-- 7. DB Functions for Permission Checks
-- ============================================

/**
 * Get all permission keys for a user (across all their roles).
 */
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    array_agg(DISTINCT rp.permission_key),
    ARRAY[]::TEXT[]
  )
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  WHERE ur.user_id = p_user_id;
$$ LANGUAGE sql STABLE;

/**
 * Check if user has a specific permission.
 * For scoped checks (target_user_id), only "all" and "own" scopes are checked generically.
 * For team/department/city scopes, implement resolve_scope() for your domain.
 */
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id UUID,
  p_permission_key TEXT,
  p_target_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  max_scope permission_scope;
BEGIN
  -- Get the maximum scope for this permission across all user roles
  SELECT MAX(rp.scope) INTO max_scope
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND rp.permission_key = p_permission_key;

  IF max_scope IS NULL THEN
    RETURN false;
  END IF;

  -- No target specified → just check if permission exists
  IF p_target_user_id IS NULL THEN
    RETURN true;
  END IF;

  -- "all" scope → access to everything
  IF max_scope = 'all' THEN
    RETURN true;
  END IF;

  -- "own" scope → only own records
  IF max_scope = 'own' THEN
    RETURN p_user_id = p_target_user_id;
  END IF;

  -- For team/department/city scopes, delegate to resolve_scope
  -- Override this function or create resolve_scope() for your domain
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 8. Row Level Security
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- For anon/authenticated users, create policies as needed:

-- Users can read their own profile
CREATE POLICY users_own_read ON users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Roles are readable by all authenticated users
CREATE POLICY roles_read ON roles
  FOR SELECT USING (true);

-- Users can see their own role assignments
CREATE POLICY user_roles_own_read ON user_roles
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Permissions are readable by all authenticated users
CREATE POLICY permissions_read ON permissions
  FOR SELECT USING (true);

CREATE POLICY role_permissions_read ON role_permissions
  FOR SELECT USING (true);
