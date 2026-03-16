'use server'

/**
 * Apollo.io API Integration Service
 * Uses organizations/search (available on free/basic plans)
 * people/search requires a paid plan and is NOT used here.
 */

const APOLLO_API_BASE = 'https://api.apollo.io/api/v1'

export interface ApolloOrganization {
    id: string
    name: string
    primary_domain?: string
    website_url?: string
    linkedin_url?: string
    phone?: string
    industry?: string
    city?: string
    state?: string
    country?: string
    estimated_num_employees?: number
    logo_url?: string
}

export interface EnrichedContact {
    id: string
    name: string
    title: string
    email: string | null
    phone: string | null
    linkedin_url?: string
}

/**
 * Search organizations by domain and/or company name.
 * Strategy: tries domain first, then falls back to company name.
 * Uses organizations/search endpoint (available on all plans).
 */
export async function searchOrganizations(
    domain: string,
    apiKey: string,
    companyName?: string
): Promise<{ success: boolean; organizations?: ApolloOrganization[]; error?: string }> {
    try {
        // Strategy 1: Search by domain
        console.log(`[Apollo] Searching orgs by domain: ${domain}`)
        const domainRes = await fetch(`${APOLLO_API_BASE}/organizations/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                organization_domains: [domain],
                page: 1,
                per_page: 5,
            })
        })

        if (domainRes.ok) {
            const data = await domainRes.json()
            if (data.organizations && data.organizations.length > 0) {
                console.log(`[Apollo] Found ${data.organizations.length} orgs by domain`)
                return { success: true, organizations: mapOrgs(data.organizations) }
            }
        }

        // Strategy 2: Fallback — search by company name
        if (companyName) {
            console.log(`[Apollo] No results by domain, trying company name: "${companyName}"`)
            const nameRes = await fetch(`${APOLLO_API_BASE}/organizations/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Api-Key': apiKey
                },
                body: JSON.stringify({
                    q_organization_name: companyName,
                    page: 1,
                    per_page: 5,
                })
            })

            if (nameRes.ok) {
                const nameData = await nameRes.json()
                if (nameData.organizations && nameData.organizations.length > 0) {
                    console.log(`[Apollo] Found ${nameData.organizations.length} orgs by name`)
                    return { success: true, organizations: mapOrgs(nameData.organizations) }
                }
            }
        }

        return { success: true, organizations: [] }
    } catch (error: any) {
        console.error('[Apollo] Search error:', error)
        return {
            success: false,
            error: error.message || 'Error al buscar en Apollo'
        }
    }
}

function mapOrgs(orgs: any[]): ApolloOrganization[] {
    return orgs.map(org => ({
        id: org.id,
        name: org.name || 'Unknown',
        primary_domain: org.primary_domain,
        website_url: org.website_url,
        linkedin_url: org.linkedin_url,
        phone: org.primary_phone?.sanitized_number || org.phone || null,
        industry: org.industry,
        city: org.city,
        state: org.state,
        country: org.country,
        estimated_num_employees: org.estimated_num_employees,
        logo_url: org.logo_url,
    }))
}

/**
 * Enrich organization data by domain (does NOT consume credits)
 * Returns company name, phone, industry, etc.
 */
export async function enrichOrganization(
    domain: string,
    apiKey: string
): Promise<{ success: boolean; organization?: ApolloOrganization; error?: string }> {
    try {
        const response = await fetch(`${APOLLO_API_BASE}/organizations/enrich`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({ domain })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
                success: false,
                error: errorData.message || errorData.error || `Apollo API error: ${response.status}`
            }
        }

        const data = await response.json()
        const org = data.organization

        if (!org) {
            return { success: true }
        }

        return {
            success: true,
            organization: {
                id: org.id,
                name: org.name,
                phone: org.primary_phone?.sanitized_number || org.phone,
                industry: org.industry,
                website_url: org.website_url,
                linkedin_url: org.linkedin_url,
                primary_domain: org.primary_domain,
                city: org.city,
                country: org.country,
                estimated_num_employees: org.estimated_num_employees,
                logo_url: org.logo_url,
            }
        }
    } catch (error: any) {
        console.error('Apollo org enrich error:', error)
        return {
            success: false,
            error: error.message || 'Failed to enrich organization'
        }
    }
}

/**
 * Search for people at a specific company.
 * Strategy:
 * 1. mixed_people/api_search with q_organization_name → discovers people (IDs + partial data)
 * 2. people/bulk_match with those IDs → full profiles (name, email, title, linkedin)
 * This works for ALL companies, not just those with org_chart_root_people_ids.
 */
export async function searchPeople(
    domain: string,
    apiKey: string,
    companyName?: string
): Promise<{ success: boolean; people?: EnrichedContact[]; error?: string }> {
    try {
        const cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .trim()

        // We need at least a company name or domain to search
        const searchName = companyName || cleanDomain?.replace(/\.[^.]+$/, '') || ''
        if (!searchName) {
            return { success: false, error: 'No company name or domain provided' }
        }

        console.log(`[Apollo] Searching people at: ${searchName} (domain: ${cleanDomain})`)

        // Step 1: Discover people via api_search
        const searchRes = await fetch(`${APOLLO_API_BASE}/mixed_people/api_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                q_organization_name: searchName,
                per_page: 15,
                page: 1,
            })
        })

        if (!searchRes.ok) {
            console.error('[Apollo] api_search failed:', searchRes.status)
            // Fallback: try org_chart approach
            return await searchPeopleViaOrgChart(cleanDomain, apiKey)
        }

        const searchData = await searchRes.json()
        const foundPeople = searchData.people || []

        console.log(`[Apollo] api_search found ${searchData.total_entries} total, ${foundPeople.length} returned`)

        if (foundPeople.length === 0) {
            // Fallback: try org_chart approach
            return await searchPeopleViaOrgChart(cleanDomain, apiKey)
        }

        // Step 2: Get full profiles via bulk_match with IDs
        const ids = foundPeople.map((p: any) => p.id).filter(Boolean)

        if (ids.length === 0) {
            return { success: true, people: [] }
        }

        const matchRes = await fetch(`${APOLLO_API_BASE}/people/bulk_match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                details: ids.map((id: string) => ({ id }))
            })
        })

        if (!matchRes.ok) {
            console.warn('[Apollo] bulk_match failed, falling back to partial data')
            // Use partial data from api_search
            const people: EnrichedContact[] = foundPeople.map((p: any) => ({
                id: p.id,
                name: `${p.first_name || ''} ${p.last_name_obfuscated || '***'}`.trim(),
                title: p.title || '',
                email: null,
                phone: null,
                linkedin_url: undefined,
            }))
            return { success: true, people }
        }

        const matchData = await matchRes.json()
        const matches = matchData.matches || []

        console.log(`[Apollo] bulk_match returned ${matches.filter(Boolean).length} profiles (${matchData.credits_consumed || 0} credits)`)

        const people: EnrichedContact[] = []
        for (let i = 0; i < matches.length; i++) {
            const m = matches[i]
            if (!m) continue

            const email = m.email && !m.email.includes('email_not_unlocked') ? m.email : null
            const phone = m.phone_numbers?.[0]?.sanitized_number || null

            people.push({
                id: m.id || ids[i] || '',
                name: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.name || 'Unknown',
                title: m.title || '',
                email,
                phone,
                linkedin_url: m.linkedin_url || undefined,
            })
        }

        console.log(`[Apollo] Successfully found ${people.length} people`)
        return { success: true, people }
    } catch (error: any) {
        console.error('[Apollo] People search error:', error)
        return {
            success: false,
            error: error.message || 'Error buscando contactos en Apollo'
        }
    }
}

/**
 * Fallback: Search for people using org_chart_root_people_ids.
 * Used when api_search is unavailable or returns no results.
 */
async function searchPeopleViaOrgChart(
    domain: string,
    apiKey: string
): Promise<{ success: boolean; people?: EnrichedContact[]; error?: string }> {
    console.log(`[Apollo] Falling back to org_chart approach for: ${domain}`)

    const orgRes = await fetch(`${APOLLO_API_BASE}/organizations/enrich`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
        },
        body: JSON.stringify({ domain })
    })

    if (!orgRes.ok) {
        return { success: false, error: `Error al buscar la organización (${orgRes.status})` }
    }

    const orgData = await orgRes.json()
    const rootPeopleIds: string[] = orgData.organization?.org_chart_root_people_ids || []

    if (rootPeopleIds.length === 0) {
        return { success: true, people: [] }
    }

    const peopleToFetch = rootPeopleIds.slice(0, 15)
    const peoplePromises = peopleToFetch.map(async (personId) => {
        try {
            const personRes = await fetch(`${APOLLO_API_BASE}/people/${personId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey }
            })
            if (!personRes.ok) return null
            const personData = await personRes.json()
            const p = personData.person
            if (!p) return null

            const email = p.email && !p.email.includes('email_not_unlocked') ? p.email : null
            const phone = p.phone_numbers?.[0]?.sanitized_number || null

            return {
                id: p.id || personId,
                name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
                title: p.title || p.headline || '',
                email,
                phone,
                linkedin_url: p.linkedin_url || undefined,
            } as EnrichedContact
        } catch {
            return null
        }
    })

    const results = await Promise.all(peoplePromises)
    const people = results.filter((p): p is EnrichedContact => p !== null)
    return { success: true, people }
}

/**
 * Reveal a person's real email and phone using people/match.
 * Email: returned synchronously in the response.
 * Phone: requires reveal_phone_number=true + webhook_url (async delivery).
 * IMPORTANT: Both organization_name AND organization_domain must be passed
 * for Apollo to return real (unlocked) data.
 */
export async function revealPerson(
    firstName: string,
    lastName: string,
    domain: string,
    apiKey: string,
    organizationName?: string,
    linkedinUrl?: string,
    revealType: 'email' | 'phone' | 'both' = 'both',
    webhookBaseUrl?: string
): Promise<{ success: boolean; person?: EnrichedContact; phoneRequested?: boolean; phoneUnavailable?: boolean; error?: string }> {
    try {
        const cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .trim()

        console.log(`[Apollo] Revealing contact: ${firstName} ${lastName} @ ${cleanDomain} (org: ${organizationName}, type: ${revealType})`)

        // Build match params — both org name and domain are critical
        const matchParams: any = {
            first_name: firstName,
            organization_domain: cleanDomain,
        }
        if (lastName) {
            matchParams.last_name = lastName
        }
        if (organizationName) {
            matchParams.organization_name = organizationName
        }
        if (linkedinUrl) {
            matchParams.linkedin_url = linkedinUrl
        }

        // Build URL with query params for reveal
        let url = `${APOLLO_API_BASE}/people/match`
        const queryParams: string[] = []

        const wantsPhone = revealType === 'phone' || revealType === 'both'
        // Apollo requires an HTTPS webhook URL for phone reveal (won't work on localhost)
        const hasValidWebhook = webhookBaseUrl && webhookBaseUrl.startsWith('https://')

        if (wantsPhone && hasValidWebhook) {
            queryParams.push('reveal_phone_number=true')
            queryParams.push(`webhook_url=${encodeURIComponent(webhookBaseUrl)}`)
        }

        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&')
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify(matchParams)
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[Apollo] Reveal error:', response.status, errorData)
            return {
                success: false,
                error: errorData.error || `Error al desbloquear contacto (${response.status})`
            }
        }

        const data = await response.json()
        const p = data.person

        if (!p) {
            return {
                success: false,
                error: 'No se encontró el contacto en Apollo.'
            }
        }

        const email = p.email && !p.email.includes('email_not_unlocked') ? p.email : null
        const phone = p.phone_numbers?.[0]?.sanitized_number || null

        console.log(`[Apollo] Revealed: email=${email}, phone=${phone}, title=${p.title}, phoneRequested=${wantsPhone && !phone}`)

        return {
            success: true,
            person: {
                id: p.id || '',
                name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '',
                title: p.title || '',
                email,
                phone,
                linkedin_url: p.linkedin_url || undefined,
            },
            // Phone was requested and will arrive via webhook (only if HTTPS webhook was used)
            phoneRequested: wantsPhone && !!hasValidWebhook && !phone,
            // Phone was requested but webhook isn't available (localhost/HTTP)
            phoneUnavailable: wantsPhone && !hasValidWebhook && !phone,
        }
    } catch (error: any) {
        console.error('[Apollo] Reveal error:', error)
        return {
            success: false,
            error: error.message || 'Error al desbloquear contacto'
        }
    }
}

