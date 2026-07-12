import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      console.error('Missing authorization header');
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

    console.log('Calling user:', callingUser.email);

    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select(`
        role_id,
        roles!inner (
          id,
          name
        )
      `)
      .eq('user_id', callingUser.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user roles: ' + rolesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User roles:', userRoles);

    const hasAdminRole = userRoles?.some(
      (ur: any) => ur.roles?.name === 'System Admin' || ur.roles?.name === 'SuperAdmin'
    );

    if (!hasAdminRole) {
      console.error('User does not have admin role');
      return new Response(
        JSON.stringify({ error: 'Forbidden: System Admin or SuperAdmin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Listing all users...');
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to list users: ' + listError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found', authUsers.users.length, 'users');

    const usersWithDetails = await Promise.all(
      authUsers.users.map(async (authUser: any) => {
        try {
          const { data: userRoles, error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .select(`
              role_id,
              roles (
                id,
                name,
                description,
                is_system,
                created_at,
                updated_at
              )
            `)
            .eq('user_id', authUser.id);

          if (rolesError) {
            console.error('Error fetching roles for user', authUser.email, ':', rolesError);
          }

          const { data: userGroups, error: groupsError } = await supabaseAdmin
            .from('user_security_groups')
            .select(`
              is_primary,
              security_groups (
                id,
                name,
                description,
                parent_group_id,
                created_at,
                updated_at
              )
            `)
            .eq('user_id', authUser.id);

          if (groupsError) {
            console.error('Error fetching groups for user', authUser.email, ':', groupsError);
          }

          const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('id, name, id_number')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (employeeError) {
            console.error('Error fetching employee for user', authUser.email, ':', employeeError);
          }

          return {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            roles: (userRoles || []).filter((ur: any) => ur.roles).map((ur: any) => ur.roles),
            security_groups: (userGroups || []).filter((ug: any) => ug.security_groups).map((ug: any) => ({
              ...ug.security_groups,
              is_primary: ug.is_primary,
            })),
            employee: employee || null,
          };
        } catch (userError) {
          console.error('Error processing user', authUser.email, ':', userError);
          return {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            roles: [],
            security_groups: [],
            employee: null,
          };
        }
      })
    );

    console.log('Successfully processed all users');

    return new Response(
      JSON.stringify({ users: usersWithDetails }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error in list-users:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
