# REGLAMENTO TÉCNICO: REPRODUCCIÓN EN SPOTIFY Y REGALÍAS

Este documento establece las directrices inmutables para el manejo de música y reproducción en **BARRZ**.

### 1. Prioridad Máxima: Generación de Regalías
- El uso de la API oficial de Spotify es **obligatorio**. Cada reproducción debe sumar streams oficiales a los autores y beatmakers.
- No se debe sustituir la música por pistas locales a menos que ocurra un error fatal explícitamente aceptado por el usuario.

### 2. Tema Completo vs Muestra de 30 Segundos
- Para que una reproducción sea completa y genere regalía, el usuario **debe contar con una cuenta de Spotify Premium**.
- Si el usuario tiene **Spotify Free**, Spotify impone técnicamente una muestra reducida de 30 segundos. El juego debe avisar de forma clara que se requiere Spotify Premium.
- La aplicación en Spotify Developer debe estar en **Modo Producción (Quota Extension)** para admitir a cualquier usuario sin agregarlo manualmente a la lista blanca. En Modo Desarrollo, cada cuenta debe agregarse en *User Management*.

### 3. Actualizaciones de la APK sin Reinstalación
- La APK utiliza Capacitor para cargar la versión web. Al desplegar cambios en GitHub y el servidor (`barrzjuego.com`), la aplicación debe invalidar la caché del navegador para reflejar el contenido nuevo sin reinstalar el juego.
- En caso de nuevas versiones de la APK compilada, debe existir una verificación de versión contra GitHub Releases para permitir la actualización directa in-app.
