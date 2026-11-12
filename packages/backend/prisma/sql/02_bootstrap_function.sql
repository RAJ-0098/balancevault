-- BalanceVault — First-admin bootstrap function
-- Run this as a superuser or database owner.
--
-- Creates a SECURITY DEFINER function that can insert the first admin user.
-- Only bootstrap_operator can execute it. After the first admin exists,
-- the function raises an exception — it can never run again.

-- The function uses gen_random_uuid() which requires pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION bootstrap_first_admin(
  p_email TEXT,
  p_password_hash TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
) RETURNS TABLE (id TEXT, email TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: only run when no admin exists
  IF EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN') THEN
    RAISE EXCEPTION 'An admin already exists — bootstrap is locked.';
  END IF;

  INSERT INTO users (id, email, password_hash, role, status, first_name, last_name, created_at, updated_at)
  VALUES (
    gen_random_uuid()::text,
    p_email,
    p_password_hash,
    'ADMIN',
    'ACTIVE',
    p_first_name,
    p_last_name,
    NOW(),
    NOW()
  )
  RETURNING id, email, role::text;
END;
$$;

-- Revoke from PUBLIC, grant only to bootstrap_operator
REVOKE ALL ON FUNCTION bootstrap_first_admin(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bootstrap_first_admin(TEXT, TEXT, TEXT, TEXT) TO bootstrap_operator;

-- Grant INSERT on audit_logs so the function (running as its owner) can log
GRANT INSERT ON audit_logs TO bootstrap_operator;

-- Also grant SELECT on users so the function can check for existing admins
GRANT SELECT ON users TO bootstrap_operator;
