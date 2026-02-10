'use server'

import { createClient } from '@/lib/auth/server'

export async function createChatSession(formData: FormData) {
    const supabase = await createClient()
    const visitorId = formData.get('visitor_id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const shopName = formData.get('shop_name') as string

    if (!visitorId) return { error: 'Visitor ID required' }

    // Check for active session
    const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('visitor_id', visitorId)
        .eq('status', 'active')
        .maybeSingle()

    if (existing) {
        return { success: true, sessionId: existing.id }
    }

    // ONLY create if we have the registration data
    // This prevents "empty" sessions from being created during the initial check
    if (!name || !email || !shopName) {
        return { success: true, sessionId: null }
    }

    const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
            visitor_id: visitorId,
            name,
            email,
            shop_name: shopName,
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

export async function markMessagesAsRead(sessionId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('sender_type', 'visitor')
        .is('read_at', null)

    if (error) {
        console.error('Error marking messages as read:', error)
        return { error: error.message }
    }
    return { success: true }
}

export async function closeChatSession(sessionId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('chat_sessions')
        .update({
            status: 'resolved',
            resolved_at: new Date().toISOString()
        })
        .eq('id', sessionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function markChatAsUnread(sessionId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('chat_sessions')
        .update({ is_read: false })
        .eq('id', sessionId)

    if (error) {
        console.error('Error marking chat as unread:', error)
        return { error: error.message }
    }
    return { success: true }
}

export async function getUnreadChatCount() {
    const supabase = await createClient()

    // Get sessions that are either unread OR have unread messages from visitors
    const { data: unreadSessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .neq('status', 'resolved')
        .eq('is_read', false)

    const { data: sessionsWithUnreadMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('session_id')
        .is('read_at', null)
        .eq('sender_type', 'visitor')

    if (sessionError || messagesError) {
        console.error('Error fetching unread count:', sessionError || messagesError)
        return { count: 0 }
    }

    // Combine both: sessions marked as unread + sessions with unread visitor messages
    const unreadSessionIds = new Set(unreadSessions?.map(s => s.id) || [])
    sessionsWithUnreadMessages?.forEach(m => unreadSessionIds.add(m.session_id))

    return { count: unreadSessionIds.size }
}

export async function getChatSettings() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error fetching chat settings:', error)
        return { error: error.message }
    }
    return { data }
}

export async function updateChatSettings(formData: FormData) {
    const supabase = await createClient()

    const settings = {
        primary_color: formData.get('primary_color') as string,
        title: formData.get('title') as string,
        subtitle: formData.get('subtitle') as string,
        bot_name: formData.get('bot_name') as string,
        greeting_message: formData.get('greeting_message') as string,
    }

    // Get the first settings row ID
    const { data: existing } = await supabase.from('chat_settings').select('id').single()

    let error
    if (existing) {
        const { error: err } = await supabase
            .from('chat_settings')
            .update(settings)
            .eq('id', existing.id)
        error = err
    } else {
        const { error: err } = await supabase
            .from('chat_settings')
            .insert(settings)
        error = err
    }

    if (error) {
        console.error('Error updating chat settings:', error)
        return { error: error.message }
    }

    return { success: true }
}
