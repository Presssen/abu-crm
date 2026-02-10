# 🛍️ Guía de Instalación del Widget de Chat ABU en Shopify

Esta guía te ayudará a instalar el widget de chat de ABU en tu tienda Shopify.

## 📋 Requisitos Previos

- Acceso al panel de administración de Shopify
- Permisos para editar el tema de la tienda

## 🚀 Instalación Paso a Paso

### Método 1: Instalación Global (Recomendado)

Este método instalará el widget en todas las páginas de tu tienda.

1. **Accede al panel de Shopify**
   - Inicia sesión en tu tienda Shopify
   - Ve a `Tienda online` → `Temas`

2. **Edita el código del tema**
   - Haz clic en `Acciones` → `Editar código`
   - Busca el archivo `theme.liquid` en la carpeta `Layout`

3. **Añade el código del widget**
   - Desplázate hasta el final del archivo
   - Justo **antes** de la etiqueta de cierre `</body>`, añade:

   ```html
   <!-- ABU Chat Widget -->
   <script src="https://crm.abuapp.io/embed.js" async></script>
   ```

4. **Guarda los cambios**
   - Haz clic en `Guardar` en la esquina superior derecha
   - ¡Listo! El widget debería aparecer en tu tienda

### Método 2: Instalación en Páginas Específicas

Si solo quieres el widget en ciertas páginas:

1. **Para la página de inicio**
   - Edita el archivo `index.liquid` o `index.json` (según tu tema)
   - Añade el código del widget al final

2. **Para páginas de producto**
   - Edita el archivo `product.liquid` o `product.json`
   - Añade el código del widget al final

3. **Para el carrito**
   - Edita el archivo `cart.liquid` o `cart.json`
   - Añade el código del widget al final

## ✅ Verificación

Después de instalar el widget:

1. Visita tu tienda en modo incógnito o desde otro navegador
2. Deberías ver el icono del chat en la esquina inferior derecha
3. Haz clic en el icono para abrir el chat
4. Verifica que no haya áreas transparentes o problemas de visualización

## 🎨 Personalización

El widget se adapta automáticamente a los colores de tu marca. Para personalizar:

1. Accede a tu panel de ABU CRM en `https://crm.abuapp.io`
2. Ve a `Configuración` → `Chat Widget`
3. Personaliza:
   - Color principal
   - Título del chat
   - Mensaje de bienvenida
   - Nombre del bot

## 🔧 Solución de Problemas

### El widget no aparece

1. **Verifica la instalación del código**
   - Asegúrate de que el código esté antes del `</body>`
   - Comprueba que no haya errores de sintaxis

2. **Limpia la caché**
   - En Shopify: `Tienda online` → `Temas` → `Acciones` → `Limpiar caché`
   - En tu navegador: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)

3. **Verifica la consola del navegador**
   - Presiona F12 para abrir las herramientas de desarrollo
   - Ve a la pestaña `Console`
   - Busca errores relacionados con ABU Chat

### El widget se ve transparente

- Esta versión actualizada corrige los problemas de transparencia
- Asegúrate de que estás usando la última versión del script
- Si el problema persiste, contacta con soporte

### Conflictos con otros widgets

Si tienes otros widgets de chat o soporte:

1. Considera desactivar otros widgets para evitar confusión
2. El widget de ABU está diseñado para coexistir con otros elementos
3. Si hay problemas de posicionamiento, contacta con soporte

## 📱 Compatibilidad

El widget es compatible con:

- ✅ Todos los temas de Shopify (Dawn, Debut, Brooklyn, etc.)
- ✅ Shopify 2.0 y versiones anteriores
- ✅ Dispositivos móviles (iOS y Android)
- ✅ Todos los navegadores modernos (Chrome, Firefox, Safari, Edge)

## 🆘 Soporte

Si necesitas ayuda:

- 📧 Email: support@abuapp.io
- 💬 Chat en vivo: https://abuapp.io
- 📚 Documentación: https://docs.abuapp.io

---

**¿Tienes preguntas?** No dudes en contactarnos. ¡Estamos aquí para ayudarte! 🚀
