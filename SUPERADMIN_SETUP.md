# Superadmin Setup Guide

## Creating the Superadmin User

To initialize the system with a superadmin user, you need to call the `init-superadmin` Edge Function once.

### Prerequisites

1. Ensure you have created the necessary roles in the database (SuperAdmin role must exist)
2. The system must not have any existing users (this function will fail if users already exist)

### Method 1: Using cURL

```bash
curl -X POST https://wgzqlxicmdlrtxlwkhts.supabase.co/functions/v1/init-superadmin \
  -H "Content-Type: application/json"
```

### Method 2: Using Browser Console

Open the browser console and run:

```javascript
fetch('https://wgzqlxicmdlrtxlwkhts.supabase.co/functions/v1/init-superadmin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

### Default Superadmin Credentials

After successfully calling the function, you can log in with:

- **Email**: `superadmin@system.local`
- **Password**: `superadmin123`

**IMPORTANT**: Change the password immediately after your first login!

## Changing the Superadmin Password

1. Log in with the default credentials
2. Click on your name/avatar in the top-right corner
3. Select "Profile"
4. Use the "Change Password" section to set a new secure password

## Troubleshooting

### Error: "System already initialized"

This means users already exist in the system. The init-superadmin function can only be used on a fresh system. You'll need to create admin users through the User Administration panel instead (if you have admin access) or use the Supabase dashboard to create a user manually and assign them the SuperAdmin role.

### Error: "SuperAdmin role not found"

You need to create the SuperAdmin role first. This role should have been created during the initial migration. Check your Supabase database to ensure the `roles` table has a role named "SuperAdmin".

## Alternative: Manual Creation via Supabase Dashboard

If the Edge Function doesn't work, you can create the superadmin user manually:

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add user"
4. Enter email: `superadmin@system.local` and a secure password
5. After creation, go to the SQL Editor
6. Run this SQL to assign the SuperAdmin role:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT
  (SELECT id FROM auth.users WHERE email = 'superadmin@system.local'),
  (SELECT id FROM roles WHERE name = 'SuperAdmin')
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'superadmin@system.local')
);
```
