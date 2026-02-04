'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/auth/server'
import * as cheerio from 'cheerio'

export async function enrichLead(leadId: string, websiteUrl: string, existingPhone?: string) {
    if (!websiteUrl) {
        return { success: false, error: 'Missing website URL' }
    }

    const supabase = await createClient()

    try {
        // 1. Get Gemini API Key from Database
        const { data: integration } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('integration_type', 'gemini_api')
            .eq('is_active', true)
            .single()

        const apiKey = integration?.credentials?.api_key

        if (!apiKey) {
            return { success: false, error: 'Gemini API Key not configured in Admin panel.' }
        }

        // 2. Fetch website content (basic scrape)
        const response = await fetch(websiteUrl, { next: { revalidate: 3600 } })
        if (!response.ok) throw new Error('Failed to fetch website')
        const html = await response.text()

        // 3. Parse text with Cheerio
        const $ = cheerio.load(html)
        $('script, style, noscript, svg, img').remove()
        const textContent = $('body').text().replace(/\s+/g, ' ').substring(0, 10000)

        // 4. Call Gemini
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `You are a lead enrichment assistant. 
        Analyze this text from ${websiteUrl}: ${textContent}
        
        TASK:
        1. Identify the person responsible for the eCommerce. 
           - Look for "eCommerce Manager", "Marketing Manager", or "CEO".
           - Prioritize eCommerce Manager, then Marketing, then CEO.
        2. Extract all contact emails.
        3. ${existingPhone ? 'DO NOT search for phone numbers.' : 'Extract the main business phone number.'}
        
        Return ONLY a JSON object with these keys:
        - responsible_name: (string)
        - responsible_role: (string)
        - emails: (array of strings)
        - phone: (string or null, only if requested)
        `

        const resultResponse = await model.generateContent(prompt)
        const responseText = resultResponse.response.text()

        // Clean markdown if Gemini returns it
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')

        return { success: true, data: result }

    } catch (error: any) {
        console.error('AI Enrichment Error:', error)
        return { success: false, error: error.message }
    }
}
