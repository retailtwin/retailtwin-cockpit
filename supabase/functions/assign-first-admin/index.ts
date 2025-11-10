import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('assign-first-admin: Function called');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    console.log('User authenticated:', user?.email)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if any admin already exists
    const { data: existingAdmins, error: adminCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (adminCheckError) {
      console.error('Error checking for existing admins:', adminCheckError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Admin already exists, not assigning to:', user.email);
      return new Response(
        JSON.stringify({ success: true, message: 'Admin already exists', is_admin: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No admin exists yet, assigning first user as admin:', user.email);

    // Check if admin role already exists for this user
    const { data: existingRole, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing role:', checkError)
      throw checkError
    }

    // If admin role doesn't exist, create it
    if (!existingRole) {
      console.log('Admin role not found, creating...')
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' })

      if (insertError) {
        console.error('Error inserting role:', insertError)
        throw insertError
      }

      console.log('Admin role assigned successfully')
      return new Response(
        JSON.stringify({ success: true, message: 'Admin role assigned', is_admin: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User already has admin role')
    return new Response(
      JSON.stringify({ success: true, message: 'Already admin', is_admin: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('assign-first-admin error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
