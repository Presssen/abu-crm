import { createClient } from '@/lib/auth/server'

/**
 * Diagnostic endpoint to check Apollo integration status
 * GET /api/enrich/apollo/status
 */
export async function GET() {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return Response.json({
                error: 'Unauthorized',
                authenticated: false
            }, { status: 401 })
        }

        // Get Apollo integration
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('*')
            .eq('integration_type', 'apollo_api')
            .maybeSingle()

        const diagnostics = {
            authenticated: true,
            user_id: user.id,
            integration_exists: !!integration,
            integration_active: integration?.is_active || false,
            has_credentials: !!integration?.credentials,
            has_api_key: !!integration?.credentials?.api_key,
            api_key_length: integration?.credentials?.api_key?.length || 0,
            api_key_preview: integration?.credentials?.api_key
                ? `${integration.credentials.api_key.substring(0, 8)}...`
                : 'N/A',
            integration_error: integrationError?.message || null,
            timestamp: new Date().toISOString()
        }

        return Response.json({
            success: true,
            diagnostics
        })

    } catch (error: any) {
        return Response.json({
            success: false,
            error: error.message || 'Internal server error',
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
