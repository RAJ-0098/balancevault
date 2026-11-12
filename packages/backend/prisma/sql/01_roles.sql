-- BalanceVault — Database role setup
-- Run this as a superuser or database owner (NOT the app_user role).
--
-- This creates the least-privilege PostgreSQL roles described in the README:
--   app_user          — NOLOGIN, CRUD on application tables (runtime role)
--   bootstrap_operator — NOLOGIN, can execute the bootstrap function
--   bootstrap_login    — LOGIN NOINHERIT, member of bootstrap_operator + app_user
--
-- The NOINHERIT flag on bootstrap_login means it must explicitly
-- SET ROLE bootstrap_operator before calling the bootstrap function.
-- This is intentional: membership grants SET ROLE capability, not
-- direct privilege inheritance.

-- ─── app_user: runtime CRUD role ──────────────────
DO $$ BEGIN
  CREATE ROLE app_user NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant privileges on all existing tables + sequences
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Grant privileges on future tables created by the migration user
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- ─── bootstrap_operator: can execute bootstrap function ──
DO $$ BEGIN
  CREATE ROLE bootstrap_operator NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── bootstrap_login: login role for first-admin setup ──
-- NOTE: set the password out of band for security:
--   ALTER ROLE bootstrap_login PASSWORD 'your-strong-password';
DO $$ BEGIN
  CREATE ROLE bootstrap_login LOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- bootstrap_login can SET ROLE to both bootstrap_operator and app_user
GRANT bootstrap_operator TO bootstrap_login;
GRANT app_user TO bootstrap_login;
