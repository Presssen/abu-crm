# 🚀 Configuración del Backend de Supabase - Guía Paso a Paso

## ❌ Error Actual
```
Error al crear el lead: Could not find the table 'public.leads' in the schema cache
```

**Causa**: Las tablas de la base de datos NO han sido creadas todavía en Supabase.

---

## ✅ Solución: Ejecutar el Script SQL

### Paso 1: Acceder a Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **abu-crm**
3. En el menú lateral izquierdo, haz clic en **SQL Editor**

### Paso 2: Ejecutar el Script de Configuración
1. Haz clic en el botón **New Query** (o **+ New query**)
2. Abre el archivo `final_db_setup.sql` que está en tu proyecto
3. **Copia TODO el contenido** del archivo
4. **Pégalo** en el editor SQL de Supabase
5. Haz clic en el botón **Run** (▶️) en la esquina inferior derecha

### Paso 3: Verificar que se Crearon las Tablas
1. En el menú lateral de Supabase, haz clic en **Table Editor**
2. Deberías ver las siguientes tablas:
   - ✅ `profiles` (Usuarios y roles)
   - ✅ `leads` (Contactos y oportunidades)
   - ✅ `tasks` (Tareas)
   - ✅ `meetings` (Reuniones)
   - ✅ `emails` (Correos enviados)
   - ✅ `integrations` (Credenciales de API)
   - ✅ `imports` (Historial de importaciones)

### Paso 4: Configurar tu Primer Usuario como Admin
1. En **Table Editor**, haz clic en la tabla `profiles`
2. Busca tu usuario (por email)
3. Haz clic en la fila
4. Cambia el campo `role` de `user` a `admin`
5. Guarda los cambios

---

## 🔧 Qué Hace el Script

El archivo `final_db_setup.sql` crea:

1. **Tabla `profiles`**: Gestión de usuarios con roles (admin, business_developer, user)
2. **Tabla `leads`**: Almacena todos los contactos y oportunidades de venta
3. **Tabla `tasks`**: Sistema de tareas con prioridades y fechas
4. **Tabla `meetings`**: Calendario de reuniones
5. **Tabla `emails`**: Registro de emails enviados
6. **Tabla `integrations`**: Credenciales de APIs (Gmail, Google Calendar, etc.)
7. **Políticas RLS**: Seguridad para que cada usuario solo vea sus datos
8. **Triggers**: Automatizan la creación de perfiles cuando un usuario se registra

---

## ⚠️ Importante

- **NO necesitas ninguna API externa** para que funcione el CRM básico
- Las integraciones de Email y Calendar son **opcionales** y se configuran después
- Una vez ejecutado el script, **podrás crear leads, tareas y reuniones inmediatamente**

---

## 🧪 Probar que Funciona

Después de ejecutar el script:

1. Recarga tu aplicación CRM
2. Ve a **Leads** → **Nuevo Lead**
3. Rellena el formulario
4. Haz clic en **Crear Lead**
5. ✅ Debería guardarse sin errores

---

## 📞 Si Sigues Teniendo Problemas

Si después de ejecutar el script sigues viendo errores:

1. Verifica que el script se ejecutó **sin errores** en Supabase
2. Comprueba que las variables de entorno en `.env.local` son correctas:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```
3. Reinicia el servidor de desarrollo: `npm run dev`
