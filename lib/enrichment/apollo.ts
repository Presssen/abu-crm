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

        // Step 2: Map results from api_search directly (NO bulk_match — that consumes credits)
        // Emails and phones will only be revealed when user explicitly clicks "Desbloquear"
        const people: EnrichedContact[] = foundPeople.map((p: any) => {
            // api_search returns first_name but last_name is often obfuscated
            // Use the full name from the 'name' field if available
            const name = p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
            
            return {
                id: p.id,
                name,
                title: p.title || p.headline || '',
                email: null, // Don't reveal — costs credits
                phone: null, // Don't reveal — costs credits
                linkedin_url: p.linkedin_url || undefined,
                has_email: p.has_email !== false, // hints for the UI
                has_phone: p.has_direct_phone === true,
            } as EnrichedContact
        })

        console.log(`[Apollo] Successfully found ${people.length} people (no credits consumed)`)
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
    webhookUrl?: string,
    apolloId?: string
): Promise<{ success: boolean; person?: EnrichedContact; phoneRequested?: boolean; phoneUnavailable?: boolean; error?: string }> {
    try {
        const cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .trim()

        const fullName = [firstName, lastName].filter(Boolean).join(' ')
        const hasValidWebhook = webhookUrl && webhookUrl.startsWith('https://')
        console.log(`[Apollo] Revealing contact: ${fullName} @ ${cleanDomain} (org: ${organizationName}, type: ${revealType}, apolloId: ${apolloId || 'none'}, webhook: ${hasValidWebhook ? 'yes' : 'no'})`)

        let personId = apolloId || null
        let bestMatchTitle = ''

        // STEP 1: If we don't have an Apollo ID, search for the person
        if (!personId) {
            const searchRes = await fetch(`${APOLLO_API_BASE}/mixed_people/api_search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Api-Key': apiKey
                },
                body: JSON.stringify({
                    q_person_name: fullName,
                    q_organization_domains: cleanDomain ? `\n${cleanDomain}` : undefined,
                    q_organization_name: organizationName || undefined,
                    per_page: 10,
                    page: 1,
                })
            })

            if (!searchRes.ok) {
                console.error('[Apollo] api_search failed:', searchRes.status)
                return { success: false, error: `Error buscando en Apollo (${searchRes.status})` }
            }

            const searchData = await searchRes.json()
            const foundPeople = searchData.people || []

            console.log(`[Apollo] api_search found ${searchData.total_entries || 0} total, ${foundPeople.length} returned`)

            if (foundPeople.length === 0) {
                return { success: false, error: 'No se encontró el contacto en Apollo.' }
            }

            const bestMatch = foundPeople.find((p: any) =>
                p.first_name?.toLowerCase() === firstName.toLowerCase()
            ) || foundPeople[0]

            personId = bestMatch.id
            bestMatchTitle = bestMatch.title || ''

            if (!personId) {
                return { success: false, error: 'No se pudo identificar al contacto en Apollo.' }
            }

            console.log(`[Apollo] Best match: ${bestMatch.first_name} (ID: ${personId}), has_email: ${bestMatch.has_email}, has_phone: ${bestMatch.has_direct_phone}`)
        } else {
            console.log(`[Apollo] Using provided Apollo ID: ${personId}`)
        }

        // STEP 2: Fast bulk_match WITHOUT reveal — check if phone is already available
        // If phone was previously revealed, it'll be in person.contact sub-object
        const matchRes = await fetch(`${APOLLO_API_BASE}/people/bulk_match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                details: [{ id: personId }],
                reveal_personal_emails: true,
            })
        })

        let email: string | null = null
        let phone: string | null = null
        let personName = fullName
        let personTitle = bestMatchTitle
        let personLinkedin: string | undefined

        if (matchRes.ok) {
            const matchData = await matchRes.json()
            const m = matchData.matches?.[0]
            console.log(`[Apollo] bulk_match (fast) credits: ${matchData.credits_consumed || 0}`)

            if (m) {
                email = m.email && !m.email.includes('email_not_unlocked') ? m.email : null
                // Check phone in multiple locations: top-level, contact sub-object, sanitized_phone
                phone = m.phone_numbers?.[0]?.sanitized_number
                    || m.contact?.phone_numbers?.[0]?.sanitized_number
                    || m.contact?.sanitized_phone
                    || m.sanitized_phone
                    || null
                personName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.name || fullName
                personTitle = m.title || personTitle
                personLinkedin = m.linkedin_url || undefined
                
                if (phone) {
                    console.log(`[Apollo] ✅ Phone already available (no reveal needed): ${phone}`)
                }
            }
        } else {
            const errText = await matchRes.text().catch(() => '')
            console.warn('[Apollo] bulk_match failed:', matchRes.status, errText)
        }

        console.log(`[Apollo] After fast bulk_match: email=${email}, phone=${phone}`)

        // STEP 3: If phone is still missing and requested, use people/match with webhook_url
        // Apollo REQUIRES webhook_url for phone reveal — phone is ALWAYS delivered async via webhook
        const wantsPhone = revealType === 'phone' || revealType === 'both'

        if (wantsPhone && !phone && hasValidWebhook) {
            console.log(`[Apollo] Requesting phone reveal via people/match with webhook_url`)
            
            const phoneMatchParams: any = {
                reveal_phone_number: true,
                organization_domain: cleanDomain,
                reveal_personal_emails: true,
                webhook_url: webhookUrl,
            }
            if (email) phoneMatchParams.email = email
            if (firstName) phoneMatchParams.first_name = firstName
            if (lastName) phoneMatchParams.last_name = lastName
            if (organizationName) phoneMatchParams.organization_name = organizationName
            if (personLinkedin) phoneMatchParams.linkedin_url = personLinkedin
            if (personId) phoneMatchParams.id = personId

            const phoneUrl = `${APOLLO_API_BASE}/people/match?reveal_phone_number=true&webhook_url=${encodeURIComponent(webhookUrl!)}`
            
            try {
                const phoneRes = await fetch(phoneUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Api-Key': apiKey
                    },
                    body: JSON.stringify(phoneMatchParams)
                })

                if (phoneRes.ok) {
                    const phoneData = await phoneRes.json()
                    const pp = phoneData.person
                    console.log(`[Apollo] people/match response keys:`, pp ? Object.keys(pp).join(',') : 'null')
                    console.log(`[Apollo] people/match phone_numbers:`, JSON.stringify(pp?.phone_numbers || []))
                    console.log(`[Apollo] people/match contact.phone_numbers:`, JSON.stringify(pp?.contact?.phone_numbers || []))
                    console.log(`[Apollo] people/match contact.sanitized_phone:`, pp?.contact?.sanitized_phone)
                    
                    // Check phone in multiple locations: top-level, contact sub-object, sanitized_phone
                    const foundPhone = pp?.phone_numbers?.[0]?.sanitized_number
                        || pp?.contact?.phone_numbers?.[0]?.sanitized_number
                        || pp?.contact?.sanitized_phone
                        || pp?.sanitized_phone
                        || null
                    
                    if (foundPhone) {
                        phone = foundPhone
                        console.log(`[Apollo] Phone found in people/match response: ${phone}`)
                    }
                    
                    if (!email && pp?.email && !pp.email.includes('email_not_unlocked')) {
                        email = pp.email
                    }
                    if (pp?.first_name && pp?.last_name) {
                        personName = [pp.first_name, pp.last_name].filter(Boolean).join(' ')
                    }
                    
                    if (!phone) {
                        console.log(`[Apollo] Phone not in sync response — will arrive via webhook at ${webhookUrl}`)
                    }
                } else {
                    const errText = await phoneRes.text().catch(() => '')
                    console.warn('[Apollo] people/match failed:', phoneRes.status, errText)
                }
            } catch (phoneErr) {
                console.warn('[Apollo] Phone reveal via match failed:', phoneErr)
            }
        } else if (wantsPhone && !phone && !hasValidWebhook) {
            console.warn('[Apollo] Cannot reveal phone: no valid HTTPS webhook URL available')
        }

        // STEP 4: If phone still missing after reveal request, poll bulk_match
        // bulk_match returns phone in person.contact sub-object once Apollo processes the reveal
        // This is DIFFERENT from GET /people/{id} which does NOT return phones
        if (wantsPhone && !phone && personId) {
            console.log(`[Apollo] Polling bulk_match for phone (up to 5 attempts, every 2s)...`)
            
            for (let attempt = 1; attempt <= 5; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 2000))
                
                try {
                    const pollRes = await fetch(`${APOLLO_API_BASE}/people/bulk_match`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Api-Key': apiKey
                        },
                        body: JSON.stringify({
                            details: [{ id: personId }],
                        })
                    })
                    
                    if (pollRes.ok) {
                        const pollData = await pollRes.json()
                        const pm = pollData.matches?.[0]
                        
                        const foundPhone = pm?.phone_numbers?.[0]?.sanitized_number
                            || pm?.contact?.phone_numbers?.[0]?.sanitized_number
                            || pm?.contact?.sanitized_phone
                            || pm?.sanitized_phone
                            || null
                        
                        if (foundPhone) {
                            phone = foundPhone
                            console.log(`[Apollo] ✅ Phone found on poll attempt ${attempt}: ${phone}`)
                            
                            if (!email && pm?.email && !pm.email.includes('email_not_unlocked')) {
                                email = pm.email
                            }
                            break
                        }
                        
                        console.log(`[Apollo] Poll ${attempt}/5: phone not yet available`)
                    }
                } catch (pollErr) {
                    console.warn(`[Apollo] Poll ${attempt} error:`, pollErr)
                }
            }
            
            if (!phone) {
                console.log(`[Apollo] Phone not available after polling`)
            }
        }

        console.log(`[Apollo] Final result: email=${email}, phone=${phone}`)

        return {
            success: true,
            person: {
                id: personId,
                name: personName,
                title: personTitle,
                email,
                phone,
                linkedin_url: personLinkedin,
            },
            phoneRequested: false, // We handle everything server-side now
            phoneUnavailable: !!(wantsPhone && !phone),
        }
    } catch (error: any) {
        console.error('[Apollo] Reveal error:', error)
        return {
            success: false,
            error: error.message || 'Error al desbloquear contacto'
        }
    }
}

