import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth/server'

/**
 * DELETE /api/admin/users/[id]
 * Deletes a user from both auth.users and public.profiles
 * Requires Admin role and SUPABASE_SERVICE_ROLE_KEY
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: userId } = await params
        const supabase = await createClient()

        // 1. Verify that the requester is an admin
        const { data: { user: requester }, error: authError } = await supabase.auth.getUser()
        if (authError || !requester) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', requester.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // 2. Prevent self-deletion
        if (userId === requester.id) {
            return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })
        }

        // 3. Initialize Admin Client with Service Role Key
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

        if (!serviceRoleKey || !supabaseUrl) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
            return NextResponse.json({
                error: 'Server configuration error: Service Role Key not found'
            }, { status: 500 })
        }

        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 4. Delete user from auth (this will cascade to public.profiles if foreign keys are set to CASCADE)
        // In our schema, profiles.id REFERENCES auth.users(id) ON DELETE CASCADE
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('Error deleting user from auth:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully'
        })

    } catch (error: any) {
        console.error('Admin delete user error:', error)
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, { status: 500 })
    }
}
