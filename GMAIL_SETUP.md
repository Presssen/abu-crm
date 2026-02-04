# Guía de Configuración de Gmail API

Para poder enviar correos directamente desde el CRM, necesitamos configurar una aplicación en Google Cloud Console. Sigue estos pasos detallados:

## 1. Crear un Proyecto en Google Cloud
1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Haz clic en el selector de proyectos (arriba a la izquierda) y selecciona **"Nuevo proyecto"**.
3. Dale un nombre (ej. `Abu CRM`) y haz clic en **"Crear"**.

## 2. Habilitar la API de Gmail
1. En el menú lateral, ve a **APIs y servicios > Biblioteca**.
2. Busca **"Gmail API"**.
3. Haz clic en ella y luego en el botón **"Habilitar"**.

## 3. Configurar la Pantalla de Consentimiento OAuth
1. Ve a **APIs y servicios > Pantalla de consentimiento de OAuth**.
2. Selecciona **"Externo"** y haz clic en **"Crear"**.
3. Rellena los campos obligatorios:
   - **Nombre de la aplicación**: `Abu CRM`
   - **Correo de asistencia al usuario**: Tu email.
   - **Información de contacto del desarrollador**: Tu email.
4. En la sección **Permisos (Scopes)**, haz clic en **"Añadir o eliminar permisos"** y busca/añade:
   - `https://www.googleapis.com/auth/gmail.send` (Para enviar correos)
5. En **Usuarios de prueba**, añade tu propio correo de Gmail para poder probar la integración mientras la app esté en modo "Prueba".

## 4. Crear Credenciales (OAuth Client ID)
1. Ve a **APIs y servicios > Credenciales**.
2. Haz clic en **"Crear credenciales" > "ID de cliente de OAuth"**.
3. Selecciona **"Aplicación web"** como tipo de aplicación.
4. **Orígenes de JavaScript autorizados**:
   - `http://localhost:3000` (Para desarrollo)
   - `https://crm.abuapp.io` (URL de producción)
5. **URIs de redireccionamiento autorizados**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://crm.abuapp.io/api/auth/callback/google`
6. Haz clic en **"Crear"** y anota el **Client ID** y el **Client Secret**.

## 5. Lo que necesito que me proporciones
Una vez completado, por favor pásame:
1. **Client ID**
2. **Client Secret**

Con esto, podré configurar el flujo de autenticación para que puedas conectar tu cuenta de Gmail y empezar a enviar correos desde el Lead Detail.
