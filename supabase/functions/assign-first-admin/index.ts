import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if this is jasper@retailtwin.com
    if (user.email !== 'jasper@retailtwin.com') {
      return new Response(
        JSON.stringify({ success: true, message: 'Not the admin account', is_admin: false }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if admin role already exists for this user
    const { data: existingRole, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // If admin role doesn't exist, create it
    if (!existingRole) {
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' })

      if (insertError) {
        throw insertError
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Admin role assigned', is_admin: true }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Already admin', is_admin: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
