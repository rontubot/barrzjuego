# Regla de Arquitectura Obligatoria: Reproducción Oficial de Spotify y Regalías

## 1. Principio Fundamental
La reproducción de instrumentales y pistas en **BARRZ** (tanto en la aplicación web como en la APK móvil) tiene como **máxima prioridad comercial y técnica** la generación de **regalías oficiales** para los beatmakers y artistas a través de la API oficial de Spotify.

Bajo ninguna circunstancia se debe reemplazar, omitir o degradar silenciosamente la reproducción oficial de Spotify por audios locales simulados si el objetivo es sumar streams oficiales.

---

## 2. Requisitos Técnicos de Spotify para Reproducción Completa y Monetización
1. **Tipo de Cuenta del Usuario:**
   - **Spotify Premium:** Es un requisito obligatorio e ineludible impuesto por Spotify para la reproducción de temas completos en reproductores externos (Web Playback SDK, Iframe Embed y Spotify Connect API).
   - **Spotify Free:** Por directiva y licencias globales de Spotify, las cuentas gratuitas solo reciben fragmentos de **30 segundos** en entornos externos. No es posible técnicamente forzar canciones completas en cuentas Free fuera de la aplicación oficial de Spotify con anuncios.
2. **Modo de la Aplicación en Spotify Developer Dashboard:**
   - **Development Mode:** La aplicación solo permite acceso a los usuarios cuyo correo electrónico esté registrado en:
     `developer.spotify.com/dashboard -> Tu App -> Settings -> User Management`.
     Cualquier usuario no registrado generará un error `HTTP 403: "The user is not registered for this application"`.
   - **Production Mode (Quota Extension):** Para lanzar la aplicación al público general sin límite de lista blanca, se debe solicitar y aprobar la "Quota Extension" en el dashboard de Spotify.
3. **Mecanismos Oficiales de Reproducción:**
   - **Spotify Web Playback SDK:** Reproducción directa integrada en navegadores web de escritorio compatibles (requiere Widevine DRM).
   - **Spotify Iframe Embed API:** Reproductor oficial con sesión activa.
   - **Spotify Web API (Connect / Remote Control):** Control remoto de la app nativa de Spotify en el dispositivo del usuario (`/v1/me/player/play`).

---

## 3. Manejo del Verificador Pre-Partida
- El verificador pre-partida debe comprobar de forma estricta que la cuenta esté vinculada y sea apta para reproducir el tema completo.
- Si se detecta un error de cuenta no registrada (`user_not_registered` / 403), cuenta Free (solo 30s) o sesión expirada:
  1. No entrar en bucles infinitos de reintentos en segundo plano.
  2. Informar con precisión el motivo exacto al usuario (por ejemplo: indicando que requiere Spotify Premium o registro en Developer Dashboard).
  3. Evitar sobrecargar la API de Spotify con llamadas repetidas a `/v1/me` o `/api/spotify/control`.

---

## 4. Estrategia de Actualización Continua de la App (OTA y APK)
- Las actualizaciones de la lógica web del juego deben poder propagarse sin obligar al usuario a desinstalar y reinstalar la APK manualmente.
- Se debe mantener el versionado sincronizado con los despliegues de GitHub y mecanismos de invalidación de caché en el WebView de Android.
