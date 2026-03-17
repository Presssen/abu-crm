-- =====================================================
-- OPTIMIZACIÓN DE RENDIMIENTO PARA 100k+ LEADS
-- Ejecutar en Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Función RPC para obtener países distintos (instantánea vs descargar 100k filas)
CREATE OR REPLACE FUNCTION get_distinct_countries()
RETURNS TABLE(country text) AS $$
  SELECT DISTINCT l.country
  FROM leads l
  WHERE l.country IS NOT NULL AND l.country != ''
  ORDER BY l.country;
$$ LANGUAGE sql STABLE;

-- 2. Función RPC para obtener ciudades distintas
CREATE OR REPLACE FUNCTION get_distinct_cities()
RETURNS TABLE(city text) AS $$
  SELECT DISTINCT l.city
  FROM leads l
  WHERE l.city IS NOT NULL AND l.city != ''
  ORDER BY l.city;
$$ LANGUAGE sql STABLE;

-- 3. Índices para acelerar filtros y paginación

-- Índice en country (filtro de país)
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country);

-- Índice en city (filtro de ciudad)
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);

-- Índice en status (filtro más usado: 'new', 'contacted', etc.)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Índice en plan (filtro Shopify Plus / Standard)
CREATE INDEX IF NOT EXISTS idx_leads_plan ON leads(plan);

-- Índice en shopify_status (filtro Password Protected, etc.)
CREATE INDEX IF NOT EXISTS idx_leads_shopify_status ON leads(shopify_status);

-- Índice en owner_id (filtro "mis leads" vs "todos")
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);

-- Índice compuesto para Marathon (status + created_at) — la query más frecuente
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);

-- Índice compuesto para paginación general (created_at desc)
CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc ON leads(created_at DESC);

-- Índice para búsqueda por dominio (muy usado en enrichment)
CREATE INDEX IF NOT EXISTS idx_leads_domain ON leads(domain);

-- 4. Índices btree para búsqueda de texto
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
