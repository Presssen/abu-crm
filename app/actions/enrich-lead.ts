'use server'

import OpenAI from 'openai'
import { createClient } from '@/lib/auth/server'
import * as cheerio from 'cheerio'

export async function enrichLead(leadId: string, websiteUrl: string) {
    if (!websiteUrl) {
        return { success: false, error: 'Missing website URL' }
    }

    const supabase = createClient()

    try {
        // 1. Get OpenAI API Key from Database (Global Integration)
        const { data: integration } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('integration_type', 'openai_api')
            .eq('is_active', true)
            .single()

        const apiKey = integration?.credentials?.api_key

        if (!apiKey) {
            return { success: false, error: 'OpenAI API Key not configured in Admin panel.' }
        }

        // 2. Fetch website content (basic scrape)
        const response = await fetch(websiteUrl, { next: { revalidate: 3600 } })
        if (!response.ok) throw new Error('Failed to fetch website')
        const html = await response.text()

        // 3. Parse text with Cheerio
        const $ = cheerio.load(html)
        // Remove scripts, styles, etc.
        $('script, style, noscript, svg, img').remove()
        const textContent = $('body').text().replace(/\s+/g, ' ').substring(0, 10000) // Limit context

        // 4. Call OpenAI
        const openai = new OpenAI({ apiKey: apiKey })
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a lead enrichment assistant. Extract contact info: CEO name, E-commerce Manager name, Emails, and Phones from the text. Return VALID JSON only with keys: contact_name (CEO or Manager), emails (array), phones (array)."
                },
                {
                    role: "user",
                    content: `Analyze this text from ${websiteUrl}: ${textContent}`
                }
            ],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" }
        })

        const result = JSON.parse(completion.choices[0].message.content || '{}')

        // Optional: Update Lead in DB automatically?
        // await supabase.from('leads').update({ ... }).eq('id', leadId)

        return { success: true, data: result }

    } catch (error: any) {
        console.error('AI Enrichment Error:', error)
        return { success: false, error: error.message }
    }
}
