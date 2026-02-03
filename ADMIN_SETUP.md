# Cómo Establecer un Administrador en Supabase

## Método 1: Desde el Dashboard de Supabase (Recomendado)

1. Ve a tu [Dashboard de Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **Table Editor**
4. Selecciona la tabla `profiles`
5. Busca el usuario que quieres hacer administrador
6. Haz clic en la fila del usuario
7. Cambia el campo `role` de `user` a `admin`
8. Guarda los cambios

## Método 2: Usando SQL Editor

1. Ve a **SQL Editor** en el Dashboard de Supabase
2. Ejecuta el siguiente comando (reemplaza el email):

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tu-email@ejemplo.com';
```

## Roles Disponibles

- **`admin`**: Acceso completo al sistema
  - Puede ver y gestionar todos los leads, tareas, reuniones
  - Acceso al panel de administración (`/admin`)
  - Puede configurar integraciones globales de API
  - Puede gestionar roles de usuarios
  
- **`business_developer`**: Usuario con permisos de ventas
  - Puede gestionar sus propios leads y tareas
  - Puede configurar sus credenciales personales de email/calendario
  - Acceso a todas las funciones del CRM excepto administración
  
- **`user`**: Usuario estándar (rol por defecto)
  - Acceso básico al CRM
  - Solo puede ver y gestionar sus propios datos

## Verificación

Para verificar que el cambio se aplicó correctamente:

1. Cierra sesión y vuelve a iniciar sesión
2. Si eres admin, deberías ver la pestaña **Admin** en el menú lateral
3. Accede a `/admin` para configurar integraciones globales

## Primer Usuario Admin

Para el primer usuario del sistema:

```sql
-- Encuentra el ID del primer usuario
SELECT id, email, role FROM profiles ORDER BY created_at LIMIT 1;

-- Hazlo admin
UPDATE profiles SET role = 'admin' WHERE id = 'el-id-que-copiaste';
```

## Notas Importantes

- Los cambios de rol se aplican inmediatamente
- El usuario debe cerrar sesión y volver a iniciar para ver los cambios en la UI
- Solo los admins pueden ver y acceder al panel de administración
- Las RLS policies garantizan que los usuarios solo vean sus propios datos
