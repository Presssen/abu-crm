-- Función RPC para obtener sectores/categorías distintos
CREATE OR REPLACE FUNCTION get_distinct_categories()
RETURNS TABLE(category text) AS $$
  SELECT DISTINCT l.categories AS category
  FROM leads l
  WHERE l.categories IS NOT NULL AND l.categories != ''
  ORDER BY l.categories;
$$ LANGUAGE sql STABLE;

-- Índice en categories para filtro de sector
CREATE INDEX IF NOT EXISTS idx_leads_categories ON leads(categories);
