import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/client' // Assuming this can be used or similar server-side client
import crypto from 'crypto'

// Use a service role client to bypass RLS for webhook updates if needed
// Or just regular client if RLS allows
const supabase = createClient() // You should ideally use a service_role client here for webhooks

export async function POST(req: NextRequest) {
    try {
        const body = await req.text()
        const hmac = req.headers.get('x-shopify-hmac-sha256')
        const topic = req.headers.get('x-shopify-topic')
        const shop = req.headers.get('x-shopify-shop-domain')

        // 1. Verify HMAC (You'll need to store the webhook secret in app_settings or env)
        const { data: settings } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('integration_type', 'shopify_api')
            .eq('is_global', true)
            .maybeSingle()

        const webhookSecret = settings?.credentials?.webhook_secret

        if (webhookSecret) {
            const generatedHash = crypto
                .createHmac('sha256', webhookSecret)
                .update(body)
                .digest('base64')

            if (generatedHash !== hmac) {
                return new NextResponse('HMAC verification failed', { status: 401 })
            }
        }

        const data = JSON.parse(body)

        // 2. Handle Topics
        switch (topic) {
            case 'app/uninstalled':
                await handleUninstall(shop, data)
                break
            case 'app_subscriptions/update':
            case 'app_subscriptions/create':
                await handleSubscription(shop, data)
                break
            case 'shop/redact':
            case 'customers/redact':
            case 'customers/data_request':
                // Mandatory GDPR webhooks
                break
            default:
                // For install, we usually get it via the auth flow, 
                // but we can use app/uninstalled for state management.
                break
        }

        return new NextResponse('OK', { status: 200 })
    } catch (error) {
        console.error('Error processing Shopify webhook:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

async function handleUninstall(shop: string | null, data: any) {
    if (!shop) return
    await supabase
        .from('shopify_installs')
        .update({
            status: 'uninstalled',
            uninstalled_at: new Date().toISOString()
        })
        .eq('shop_domain', shop)
}

async function handleSubscription(shop: string | null, data: any) {
    if (!shop) return

    // UPSERT Shopify Install info
    const { data: install } = await supabase
        .from('shopify_installs')
        .upsert({
            shop_domain: shop,
            status: 'active',
            plan_name: data.app_subscription?.name || 'Unknown',
            updated_at: new Date().toISOString()
        }, { onConflict: 'shop_domain' })
        .select()
        .single()

    // Record Payment if it's a new or updated charge
    if (data.app_subscription) {
        const sub = data.app_subscription
        await supabase
            .from('shopify_payments')
            .upsert({
                shop_domain: shop,
                amount: parseFloat(sub.price) || 0,
                currency: sub.currency_code || 'USD',
                charge_id: sub.admin_graphql_api_id,
                status: sub.status?.toLowerCase(),
                type: 'subscription',
                description: sub.name,
                created_at: sub.created_at
            }, { onConflict: 'charge_id' })
    }

    // Also ensure the shop exists as a lead in CRM for sales tracking
    await supabase
        .from('leads')
        .upsert({
            company_name: shop,
            shopify_domain: shop,
            source: 'Shopify App',
            status: 'won' // If they pay, they are won
        }, { onConflict: 'shopify_domain' })
}
