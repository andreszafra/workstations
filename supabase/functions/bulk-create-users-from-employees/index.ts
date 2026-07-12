import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BulkCreateRequest {
  employeeIds: string[];
  defaultPassword?: string;
  useIdAsPassword?: boolean;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !callingUser) {
      console.error('Auth error:', authError?.message || 'No user found');
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

    const body: BulkCreateRequest = await req.json();
    const { employeeIds, defaultPassword, useIdAsPassword = false, roleIds, securityGroupIds, requirePasswordChange = true } = body;

    if (!employeeIds || employeeIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No employees selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!defaultPassword && !useIdAsPassword) {
      return new Response(
        JSON.stringify({ error: 'Default password is required or useIdAsPassword must be enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, user_id, id_number')
      .in('id', employeeIds);

    if (employeesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch employees: ' + employeesError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
      skipped: [] as any[],
    };

    for (const employee of employees) {
      if (employee.user_id) {
        results.skipped.push({
          employeeId: employee.id,
          name: employee.name,
          reason: 'Already has a user account',
        });
        continue;
      }

      if (!employee.email) {
        results.failed.push({
          employeeId: employee.id,
          name: employee.name,
          error: 'No email address',
        });
        continue;
      }

      try {
        const passwordToUse = useIdAsPassword ? employee.id_number : defaultPassword;

        if (!passwordToUse) {
          results.failed.push({
            employeeId: employee.id,
            name: employee.name,
            error: useIdAsPassword ? 'No ID number available for password' : 'No password provided',
          });
          continue;
        }

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: employee.email,
          password: passwordToUse,
          email_confirm: true,
          user_metadata: {
            first_name: employee.name?.split(' ')[0] || '',
            last_name: employee.name?.split(' ').slice(1).join(' ') || '',
          },
        });

        if (createError || !newUser.user) {
          results.failed.push({
            employeeId: employee.id,
            name: employee.name,
            error: createError?.message || 'Failed to create user',
          });
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from('employees')
          .update({ user_id: newUser.user.id })
          .eq('id', employee.id);

        if (updateError) {
          results.failed.push({
            employeeId: employee.id,
            name: employee.name,
            error: 'User created but failed to link: ' + updateError.message,
          });
          continue;
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
          await supabaseAdmin
            .from('user_password_requirements')
            .insert({
              user_id: newUser.user.id,
              require_password_change: true,
            });
        }

        results.success.push({
          employeeId: employee.id,
          name: employee.name,
          email: employee.email,
          userId: newUser.user.id,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.failed.push({
          employeeId: employee.id,
          name: employee.name,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error in bulk-create-users-from-employees:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
