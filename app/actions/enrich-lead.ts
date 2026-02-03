'use server'

import OpenAI from 'openai'
import { createClient } from '@/lib/auth/server'
import * as cheerio from 'cheerio'

export async function enrichLead(leadId: string, websiteUrl: string, openaiApiKey: string) {
    if (!websiteUrl || !openaiApiKey) {
        return { success: false, error: 'Missing website or API key' }
    }

    try {
        // 1. Fetch website content (basic scrape)
        const response = await fetch(websiteUrl, { next: { revalidate: 3600 } })
        if (!response.ok) throw new Error('Failed to fetch website')
        const html = await response.text()

        // 2. Parse text with Cheerio
        const $ = cheerio.load(html)
        // Remove scripts, styles, etc.
        $('script, style, noscript, svg, img').remove()
        const textContent = $('body').text().replace(/\s+/g, ' ').substring(0, 10000) // Limit context

        // 3. Call OpenAI
        const openai = new OpenAI({ apiKey: openaiApiKey })
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

        return { success: true, data: result }

    } catch (error: any) {
        console.error('AI Enrichment Error:', error)
        return { success: false, error: error.message }
    }
}
