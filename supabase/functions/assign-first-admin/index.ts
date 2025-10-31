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

    // Check if any admin exists (using service role key to bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (checkError) {
      throw checkError
    }

    // If no admin exists, make this user an admin
    if (!existingAdmins || existingAdmins.length === 0) {
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
      JSON.stringify({ success: true, message: 'Admin already exists', is_admin: false }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
