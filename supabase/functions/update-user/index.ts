import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpdateUserRequest {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string | null;
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: ' + (authError?.message || 'Invalid token') }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userRoles } = await supabaseClient
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

    const body: UpdateUserRequest = await req.json();
    const { userId, email, firstName, lastName, employeeId } = body;

    console.log('Updating user:', userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (employeeId !== undefined) {
      if (employeeId) {
        const { data: existingEmployee } = await supabaseAdmin
          .from('employees')
          .select('user_id')
          .eq('id', employeeId)
          .maybeSingle();

        if (existingEmployee?.user_id && existingEmployee.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Employee is already linked to another user' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: currentEmployee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (currentEmployee) {
        await supabaseAdmin
          .from('employees')
          .update({ user_id: null })
          .eq('user_id', userId);
      }

      if (employeeId) {
        const { error: linkError } = await supabaseAdmin
          .from('employees')
          .update({ user_id: userId })
          .eq('id', employeeId);

        if (linkError) {
          console.error('Error linking employee:', linkError);
          return new Response(
            JSON.stringify({ error: `Failed to link employee: ${linkError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (firstName !== undefined || lastName !== undefined) {
      updateData.user_metadata = {
        first_name: firstName,
        last_name: lastName,
      };
    }

    if (Object.keys(updateData).length > 0) {
      const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updateData
      );

      if (updateError) {
        console.error('Error updating user:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message || 'Failed to update user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User updated successfully:', userId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unhandled error in update-user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
