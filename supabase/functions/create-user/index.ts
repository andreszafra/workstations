import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  roleIds?: string[];
  securityGroupIds?: string[];
  requirePasswordChange?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !callingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: ' + (authError?.message || 'Invalid token') }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', callingUser.id);

    const hasAdminRole = userRoles?.some(
      (ur: any) => ur.role?.name === 'System Admin' || ur.role?.name === 'SuperAdmin'
    );

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: System Admin or SuperAdmin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateUserRequest = await req.json();
    const { email, password, firstName, lastName, employeeId, roleIds, securityGroupIds, requirePasswordChange = false } = body;

    console.log('Creating user:', { email, firstName, lastName, employeeId });

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (employeeId) {
      const { data: existingEmployee } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();

      if (existingEmployee?.user_id) {
        return new Response(
          JSON.stringify({ error: 'Employee already has a user account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      const errorMsg = createError?.message || createError?.toString() || 'Failed to create user';
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', newUser.user.id);

    if (employeeId) {
      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: newUser.user.id })
        .eq('id', employeeId);

      if (updateError) {
        console.error('Error updating employee:', updateError);
        return new Response(
          JSON.stringify({ error: `User created but failed to link employee: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (roleIds && roleIds.length > 0) {
      const userRolesToInsert = roleIds.map(roleId => ({
        user_id: newUser.user.id,
        role_id: roleId,
      }));
      await supabaseAdmin.from('user_roles').insert(userRolesToInsert);
    }

    if (securityGroupIds && securityGroupIds.length > 0) {
      const userGroupsToInsert = securityGroupIds.map(groupId => ({
        user_id: newUser.user.id,
        security_group_id: groupId,
        is_primary: false,
      }));
      await supabaseAdmin.from('user_security_groups').insert(userGroupsToInsert);
    }

    if (requirePasswordChange) {
      const { error: reqError } = await supabaseAdmin
        .from('user_password_requirements')
        .insert({
          user_id: newUser.user.id,
          require_password_change: true,
        });

      if (reqError) {
        console.error('Error setting password change requirement:', reqError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error in create-user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
