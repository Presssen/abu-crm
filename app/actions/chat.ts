'use server'

import { createClient } from '@/lib/auth/server'

export async function createChatSession(formData: FormData) {
    const supabase = await createClient()
    const visitorId = formData.get('visitor_id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string

    if (!visitorId) return { error: 'Visitor ID required' }

    // Check for active session
    const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('visitor_id', visitorId)
        .eq('status', 'active')
        .single()

    if (existing) {
        return { success: true, sessionId: existing.id }
    }

    const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
            visitor_id: visitorId,
            name,
            email,
            status: 'active'
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating chat session:', error)
        return { error: error.message }
    }

    return { success: true, sessionId: data.id }
}

export async function sendMessage(formData: FormData) {
    const supabase = await createClient()
    const sessionId = formData.get('session_id') as string
    const content = formData.get('content') as string
    const senderType = formData.get('sender_type') as 'visitor' | 'agent'

    if (!sessionId || !content) {
        return { error: 'Missing fields' }
    }

    const { error } = await supabase
        .from('chat_messages')
        .insert({
            session_id: sessionId,
            content,
            sender_type: senderType
        })

    if (error) {
        console.error('Error sending message:', error)
        return { error: error.message }
    }

    // Update session updated_at
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId)

    return { success: true }
}

export async function getChatHistory(sessionId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

    if (error) return { error: error.message }
    return { data }
}

export async function closeChatSession(sessionId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('chat_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId)

    if (error) return { error: error.message }
    return { success: true }
}
