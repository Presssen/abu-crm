'use server'

/**
 * Apollo.io API Integration Service
 * Provides functions to search and enrich contact data from Apollo
 */

const APOLLO_API_BASE = 'https://api.apollo.io/v1'

export interface ApolloContact {
    id: string
    name: string
    title: string
    organization_name?: string
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
 * Step 1: Search for people by domain (does NOT consume credits)
 * Uses the mixed_people/search endpoint to get initial results
 */
export async function searchPeopleByDomain(
    domain: string,
    apiKey: string
): Promise<{ success: boolean; contacts?: ApolloContact[]; error?: string }> {
    try {
        // Priority job titles for ecommerce businesses
        const priorityTitles = [
            'ecommerce manager',
            'e-commerce manager',
            'marketing manager',
            'ceo',
            'founder',
            'owner',
            'chief executive',
            'director of ecommerce',
            'head of ecommerce'
        ]

        const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                organization_domains: [domain],
                page: 1,
                per_page: 10,
                // Filter by seniority and titles
                person_titles: priorityTitles
            })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
                success: false,
                error: errorData.message || `Apollo API error: ${response.status}`
            }
        }

        const data = await response.json()

        if (!data.people || data.people.length === 0) {
            return {
                success: true,
                contacts: []
            }
        }

        // Map to our contact format
        const contacts: ApolloContact[] = data.people.map((person: any) => ({
            id: person.id,
            name: person.name || 'Unknown',
            title: person.title || 'No title',
            organization_name: person.organization?.name
        }))

        return {
            success: true,
            contacts
        }
    } catch (error: any) {
        console.error('Apollo search error:', error)
        return {
            success: false,
            error: error.message || 'Failed to search Apollo'
        }
    }
}

/**
 * Step 2: Enrich selected contacts (CONSUMES credits - 1 per contact)
 * Uses the people/bulk_match endpoint to get full contact details
 */
export async function enrichContacts(
    contactIds: string[],
    apiKey: string
): Promise<{ success: boolean; contacts?: EnrichedContact[]; error?: string }> {
    try {
        if (contactIds.length === 0) {
            return { success: true, contacts: [] }
        }

        // Apollo limits bulk_match to 10 contacts per request
        if (contactIds.length > 10) {
            return {
                success: false,
                error: 'Maximum 10 contacts can be enriched at once'
            }
        }

        const response = await fetch(`${APOLLO_API_BASE}/people/bulk_match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                details: contactIds.map(id => ({ id }))
            })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
                success: false,
                error: errorData.message || `Apollo API error: ${response.status}`
            }
        }

        const data = await response.json()

        if (!data.matches || data.matches.length === 0) {
            return {
                success: true,
                contacts: []
            }
        }

        // Map to enriched contact format
        const contacts: EnrichedContact[] = data.matches.map((match: any) => ({
            id: match.id,
            name: match.name || 'Unknown',
            title: match.title || 'No title',
            email: match.email || null,
            phone: match.phone_numbers?.[0]?.sanitized_number || null,
            linkedin_url: match.linkedin_url
        }))

        return {
            success: true,
            contacts
        }
    } catch (error: any) {
        console.error('Apollo enrich error:', error)
        return {
            success: false,
            error: error.message || 'Failed to enrich contacts'
        }
    }
}
