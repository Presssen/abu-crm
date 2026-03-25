import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/auth/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client that bypasses RLS for public submissions
function createPublicClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()

        const full_name = formData.get('full_name') as string
        const email = formData.get('email') as string
        const phone = formData.get('phone') as string
        const has_computer = formData.get('has_computer') === 'true'
        const has_phone = formData.get('has_phone') === 'true'
        const work_mode = formData.get('work_mode') as string
        const cover_letter = formData.get('cover_letter') as string
        const linkedin_url = formData.get('linkedin_url') as string
        const video_url = formData.get('video_url') as string
        const cv = formData.get('cv') as File | null

        // Validation
        if (!full_name || !email || !phone) {
            return NextResponse.json(
                { error: 'Nombre, email y teléfono son obligatorios' },
                { status: 400 }
            )
        }

        const supabase = createPublicClient()
        let cv_url: string | null = null

        // Upload CV to Supabase Storage
        if (cv && cv.size > 0) {
            const timestamp = Date.now()
            const safeName = full_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
            const ext = cv.name.split('.').pop() || 'pdf'
            const filePath = `${safeName}_${timestamp}.${ext}`

            const buffer = Buffer.from(await cv.arrayBuffer())

            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('applications-cv')
                .upload(filePath, buffer, {
                    contentType: cv.type || 'application/pdf',
                    upsert: false
                })

            if (uploadError) {
                console.error('CV upload error:', uploadError)
                // Continue without CV if upload fails
            } else {
                const { data: urlData } = supabase
                    .storage
                    .from('applications-cv')
                    .getPublicUrl(filePath)
                cv_url = urlData.publicUrl
            }
        }

        // Insert application
        const { data, error } = await supabase
            .from('applications')
            .insert({
                full_name,
                email,
                phone,
                has_computer,
                has_phone,
                work_mode: work_mode || 'remote',
                cv_url,
                video_url: video_url || null,
                linkedin_url: linkedin_url || null,
                cover_letter: cover_letter || null,
                status: 'pending'
            })
            .select('id')
            .single()

        if (error) {
            console.error('Application insert error:', error)
            return NextResponse.json(
                { error: 'Error al enviar la candidatura. Inténtalo de nuevo.' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, id: data.id })

    } catch (error: any) {
        console.error('Application API error:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

// GET: List applications (authenticated only)
export async function GET() {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ applications: data })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH: Update application status/notes (authenticated only)
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, status, notes } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Application ID required' }, { status: 400 })
        }

        const updates: any = { updated_at: new Date().toISOString() }
        if (status) updates.status = status
        if (notes !== undefined) updates.notes = notes

        const { error } = await supabase
            .from('applications')
            .update(updates)
            .eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
