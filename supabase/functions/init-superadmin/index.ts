import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();

    if (existingUsers && existingUsers.users.length > 0) {
      return new Response(
        JSON.stringify({ error: 'System already initialized. Users exist.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: superadminRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'SuperAdmin')
      .maybeSingle();

    if (!superadminRole) {
      return new Response(
        JSON.stringify({ error: 'SuperAdmin role not found. Please create roles first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'superadmin@system.local',
      password: 'superadmin123',
      email_confirm: true,
      user_metadata: {
        first_name: 'Super',
        last_name: 'Admin',
      },
    });

    if (createError || !newUser.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || 'Failed to create superadmin user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin.from('user_roles').insert({
      user_id: newUser.user.id,
      role_id: superadminRole.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Superadmin user created successfully',
        credentials: {
          email: 'superadmin@system.local',
          password: 'superadmin123'
        },
        warning: 'IMPORTANT: Please change the password immediately after first login!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});