import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/enrich/apollo/enrich
 * This endpoint requires Apollo paid plan (people/search access).
 * Currently not available on the free/basic plan being used.
 */
export async function POST(request: NextRequest) {
    return NextResponse.json({
        error: 'El enriquecimiento individual de contactos requiere un plan de Apollo de pago. Usa la búsqueda de organizaciones (gratuita) en su lugar.',
        success: false
    }, { status: 400 })
}
