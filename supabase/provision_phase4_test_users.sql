-- ==============================================================================
-- PROJECT FINN: Phase 4.1 Test User Provisioning Script (GoTrue 500 Scan Fix)
-- File: supabase/provision_phase4_test_users.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure all string columns in auth.users are non-null empty strings
-- (GoTrue crashes with "500: Database error querying schema" if strings are NULL)
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  is_sso_user = COALESCE(is_sso_user, false),
  is_anonymous = COALESCE(is_anonymous, false),
  aud = 'authenticated',
  role = 'authenticated'
WHERE email IN ('user_a_audit@test.com', 'user_b_audit@test.com');

-- 2. Update identity data with required GoTrue claim keys
UPDATE auth.identities
SET 
  identity_data = json_build_object(
    'sub', user_id::text,
    'email', (SELECT email FROM auth.users WHERE id = auth.identities.user_id),
    'email_verified', true,
    'phone_verified', false
  )::jsonb,
  provider_id = user_id::text
WHERE user_id IN ('a0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid);
