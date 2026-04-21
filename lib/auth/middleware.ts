import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Public routes (including /blocked and API webhooks)
    const publicPaths = ['/login', '/signup', '/forgot-password', '/auth/callback', '/pending-approval', '/blocked', '/chat-widget', '/apply', '/presentation']
    const isPublicPath = publicPaths.includes(path)
    
    // Allow external webhooks and API callbacks without authentication
    const isWebhookPath = path.startsWith('/api/enrich/apollo/webhook') || path.startsWith('/api/webhook') || path.startsWith('/api/applications')
    
    if (isPublicPath || isWebhookPath) {
        if (user) {
            // Check status if logged in and trying to access public/pending/blocked pages
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_approved, is_blocked')
                .eq('id', user.id)
                .single()

            // 1. Blocked users always go to /blocked
            if (profile?.is_blocked) {
                if (path !== '/blocked') {
                    return NextResponse.redirect(new URL('/blocked', request.url))
                }
                return response
            }

            // 2. Approved (or admin) users should be redirected from pending/blocked/login/signup to dashboard
            if (profile?.is_approved || profile?.role === 'admin') {
                if (['/pending-approval', '/blocked', '/login', '/signup'].includes(path)) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            } else if (path !== '/pending-approval') {
                // 3. Unapproved users (not blocked) go to /pending-approval
                return NextResponse.redirect(new URL('/pending-approval', request.url))
            }
        }
        return response
    }

    // Protected routes
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Fetch profile for protected route checks
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_approved, is_blocked')
        .eq('id', user.id)
        .single()

    // 1. Blocked check
    if (profile?.is_blocked) {
        return NextResponse.redirect(new URL('/blocked', request.url))
    }

    // 2. Approval check (restricted for non-admins)
    if (profile && !profile.is_approved && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/pending-approval', request.url))
    }

    // Admin route protection
    if (path.startsWith('/admin')) {
        if (profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return response
}
