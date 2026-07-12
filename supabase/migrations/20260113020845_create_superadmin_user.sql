/*
  # Create Superadmin User
  
  This migration creates the initial superadmin user for the system.
  
  Default credentials:
  - Email: superadmin@system.local
  - Password: superadmin123
  
  IMPORTANT: Change the password immediately after first login!
*/

-- Create the superadmin user
DO $$
DECLARE
  new_user_id uuid;
  superadmin_role_id uuid;
BEGIN
  -- Get the SuperAdmin role ID
  SELECT id INTO superadmin_role_id FROM roles WHERE name = 'SuperAdmin';
  
  IF superadmin_role_id IS NULL THEN
    RAISE EXCEPTION 'SuperAdmin role not found';
  END IF;

  -- Check if superadmin user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@system.local') THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'superadmin@system.local',
      crypt('superadmin123', gen_salt('bf')),
      now(),
      NULL,
      '',
      NULL,
      '',
      NULL,
      '',
      '',
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"Super","last_name":"Admin"}',
      NULL,
      now(),
      now(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      false,
      NULL
    )
    RETURNING id INTO new_user_id;

    -- Assign SuperAdmin role to the user
    INSERT INTO user_roles (user_id, role_id)
    VALUES (new_user_id, superadmin_role_id);

    RAISE NOTICE 'Superadmin user created successfully with ID: %', new_user_id;
  ELSE
    RAISE NOTICE 'Superadmin user already exists';
  END IF;
END $$;
