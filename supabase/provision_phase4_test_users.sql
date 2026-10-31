-- ==============================================================================
-- PROJECT FINN: Phase 4.1 Test User Provisioning Script
-- File: supabase/provision_phase4_test_users.sql
-- ==============================================================================
-- Provisions two disposable test accounts with pre-confirmed email status
-- directly in Supabase auth.users.
--
-- STRICT SECURITY GUARANTEE:
-- 1. Keeps production email confirmation fully enabled (does not touch auth.config).
-- 2. Uses cryptographic bcrypt password hashing.
-- 3. Enables immediate client login via /auth/v1/token?grant_type=password
--    without hitting built-in SMTP email rate limits.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_a_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_user_b_id UUID := 'b0000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- 1. PROVISION USER A (user_a_audit@test.com / P@ssw0rd_Phase4_UserA!)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user_a_audit@test.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_a_id,
      'authenticated',
      'authenticated',
      'user_a_audit@test.com',
      crypt('P@ssw0rd_Phase4_UserA!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Auditor User Alpha"}'::jsonb,
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_a_id,
      v_user_a_id,
      json_build_object('sub', v_user_a_id::text, 'email', 'user_a_audit@test.com')::jsonb,
      'email',
      v_user_a_id::text,
      now(),
      now(),
      now()
    ) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('P@ssw0rd_Phase4_UserA!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE email = 'user_a_audit@test.com';
  END IF;

  -- 2. PROVISION USER B (user_b_audit@test.com / P@ssw0rd_Phase4_UserB!)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user_b_audit@test.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_b_id,
      'authenticated',
      'authenticated',
      'user_b_audit@test.com',
      crypt('P@ssw0rd_Phase4_UserB!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Auditor User Beta"}'::jsonb,
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_b_id,
      v_user_b_id,
      json_build_object('sub', v_user_b_id::text, 'email', 'user_b_audit@test.com')::jsonb,
      'email',
      v_user_b_id::text,
      now(),
      now(),
      now()
    ) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('P@ssw0rd_Phase4_UserB!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE email = 'user_b_audit@test.com';
  END IF;

  RAISE NOTICE 'Phase 4.1 Test Users successfully provisioned with pre-confirmed email status.';
END $$;
