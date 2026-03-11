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

        // 2. Normalize URL — ensure it has https://
        let normalizedUrl = websiteUrl.trim()
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = `https://${normalizedUrl}`
        }

        console.log('[Enrich] Fetching website:', normalizedUrl)

        // 3. Fetch website content — try main page, then /contacto, /about, etc.
        let textContent = ''
        let htmlTitle = ''
        let ogSiteName = ''
        const pagesToTry = [
            normalizedUrl,
            `${normalizedUrl}/contacto`,
            `${normalizedUrl}/contact`,
            `${normalizedUrl}/about`,
            `${normalizedUrl}/sobre-nosotros`,
        ]

        for (const pageUrl of pagesToTry) {
            try {
                const response = await fetch(pageUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                    },
                    signal: AbortSignal.timeout(10000), // 10 second timeout
                })
                if (response.ok) {
                    const html = await response.text()
                    const $ = cheerio.load(html)

                    // GUARANTEED: Extract <title> and og:site_name BEFORE removing meta tags
                    if (!htmlTitle) {
                        const titleTag = $('title').first().text().trim()
                        if (titleTag) htmlTitle = titleTag
                    }
                    if (!ogSiteName) {
                        const ogName = $('meta[property="og:site_name"]').attr('content')?.trim()
                        if (ogName) ogSiteName = ogName
                    }

                    $('script, style, noscript, svg, img, link, meta').remove()

                    // Extract useful text
                    const pageText = $('body').text().replace(/\s+/g, ' ').trim()
                    if (pageText.length > 100) {
                        textContent += `\n--- Page: ${pageUrl} ---\n${pageText.substring(0, 5000)}`
                        console.log(`[Enrich] Got ${pageText.length} chars from ${pageUrl}`)
                    }
                }
            } catch (fetchErr: any) {
                console.log(`[Enrich] Could not fetch ${pageUrl}: ${fetchErr.message}`)
            }
        }

        console.log('[Enrich] HTML title:', htmlTitle)
        console.log('[Enrich] og:site_name:', ogSiteName)

        // Helper: derive a clean company name from the domain
        const deriveNameFromDomain = (url: string): string => {
            const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim()
            const parts = domain.split(/[.-]/)
            const nonCommon = parts.filter(p => !['www', 'com', 'es', 'net', 'org', 'co', 'uk', 'store', 'shop', 'io', 'dev'].includes(p.toLowerCase()))
            return nonCommon.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || domain
        }

        // GUARANTEED fallback: build best company name from HTML metadata
        const fallbackCompanyName = ogSiteName
            || (htmlTitle ? htmlTitle.split(/[|–—\-:]/)[0].trim() : '')
            || deriveNameFromDomain(normalizedUrl)

        if (!textContent || textContent.length < 50) {
            console.log('[Enrich] Not enough text content for AI, using HTML metadata fallback')
            return {
                success: true,
                data: {
                    company_name: fallbackCompanyName,
                    responsible_name: null,
                    responsible_role: null,
                    emails: [],
                    phone: null
                }
            }
        }

        // Trim to max 12000 chars for Gemini
        textContent = textContent.substring(0, 12000)

        console.log('[Enrich] Sending to Gemini, text length:', textContent.length)

        // 4. Call Gemini with relaxed safety settings (we're only extracting business contacts)
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
            ],
        })

        const prompt = `You are a lead enrichment assistant analyzing a Spanish ecommerce website.
Analyze this text scraped from ${normalizedUrl}:

${textContent}

YOUR TASK:
1. Find the CORRECT company/commercial brand name.
   - Cross-reference the URL (${normalizedUrl}) with the website text.
   - For example, if the URL is "oxy-shop.com" and the text mentions "Oxy", the commercial name is likely "Oxy-Shop".
   - Make sure the commercial name you set is the REAL and accurate one. Do not include 'https://' or '.com'.
2. Identify the person responsible for making eCommerce decisions.
   - Look for: CEO, Founder, Owner, eCommerce Manager, Marketing Manager, Digital Manager, CTO, COO.
   - Prioritize: eCommerce Manager > Marketing Manager > Digital Manager > CEO/Founder.
   - If no specific person is named, return null for responsible_name.
3. Extract ALL contact emails found on the site.
4. ${existingPhone ? 'The lead already has a phone. Set phone to null.' : 'Extract the main business phone number if available.'}

IMPORTANT: 
- Only return REAL data found in the text. Do NOT invent or fabricate names, emails, or phones.
- If you cannot find a specific piece of data, return null or empty array for that field.

Return ONLY a valid JSON object (no markdown, no explanation) with these keys:
{
  "company_name": "string (the correct/official company name from the website)",
  "responsible_name": "string or null",
  "responsible_role": "string or null",
  "emails": ["array of email strings found"],
  "phone": "string or null"
}`

        let aiResult: any = null
        try {
            const resultResponse = await model.generateContent(prompt)
            const responseText = resultResponse.response.text()

            console.log('[Enrich] Gemini raw response:', responseText)

            // Clean markdown if Gemini returns it
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                aiResult = JSON.parse(jsonMatch[0])
                console.log('[Enrich] Parsed AI result:', aiResult)
            }
        } catch (aiError: any) {
            console.warn('[Enrich] Gemini AI failed (likely content policy block):', aiError.message)
            // AI failed — we'll use fallback below
        }

        // Build final result: AI data if available, fallback for company name if not
        const finalResult = {
            company_name: aiResult?.company_name || fallbackCompanyName,
            responsible_name: aiResult?.responsible_name || null,
            responsible_role: aiResult?.responsible_role || null,
            emails: aiResult?.emails || [],
            phone: aiResult?.phone || null,
        }

        console.log('[Enrich] Final result:', finalResult)
        return { success: true, data: finalResult }

    } catch (error: any) {
        console.error('[Enrich] Error:', error)
        return { success: false, error: error.message }
    }
}
