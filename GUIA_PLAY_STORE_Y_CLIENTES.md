# 🚀 GUÍA EJECUTIVA: PUBLICACIÓN EN GOOGLE PLAY STORE Y REUNIÓN CON CLIENTES — BARRZ FREESTYLE

**Fecha:** 10 de Noviembre de 2026  
**ID de Paquete (Application ID):** `com.barrz.freestyle`  
**Versión de Lanzamiento:** `3.1.0` (`versionCode: 1`)  
**Target SDK:** API 36 (Cumple 100% la normativa de Google Play 2026)

---

## 🛠️ PARTE 1: LO QUE YA DEJAMOS HECHO Y LISTO EN TU PROYECTO

1. **Sistema de Auto-Actualización Silenciosa (OTA sin cambiar APK/AAB):**
   - Cada vez que hagas `git push` y se actualice `barrzjuego.com`, la app instalada desde Play Store detectará el nuevo commit automáticamente durante la pantalla de carga inicial y mostrará los cambios en vivo sin necesidad de subir una nueva versión a Google Play.
   - Si el usuario abre la app **sin internet (Modo Offline)**, la app usa automáticamente el paquete local interno con las 52 cartas de desafío y los 15 beats locales.
   - El commit de Git ahora se inyecta de forma 100% automática al compilar (`vite.config.ts`), por lo que no tienes que cambiar ningún número ni hash a mano.

2. **Llave Criptográfica Oficial de Producción (Upload Keystore):**
   - **Archivo generado:** `android/app/barrz-release-key.jks`
   - **Configuración automática:** `android/keystore.properties` y `android/app/build.gradle`
   - **Alias:** `barrz_upload_key`
   - **Contraseña del Keystore y de la Llave:** `B4rrz$Fr33styl3#L4b_98!xK7@2026`
   - **Huella SHA-1 (Certificado de Subida):**
     ```text
     E1:F7:D4:85:63:63:97:FF:18:4E:CF:E7:36:5F:AF:39:07:C4:06:69
     ```
   - **Huella SHA-256 (Certificado de Subida):**
     ```text
     76:5C:02:40:D5:64:CD:D7:7D:72:19:6E:CD:56:8C:9F:F9:2A:77:CF:6E:B7:BF:F9:64:40:99:C1:2D:6F:18:23
     ```
   > ⚠️ **IMPORTANTE:** Guarda una copia de seguridad de `android/app/barrz-release-key.jks` en un lugar seguro (Google Drive / USB). Google Play exige firmar futuras actualizaciones nativas siempre con esta misma llave.

3. **Cumplimiento Legal Obligatorio de Google Play (Política de Privacidad y Eliminación de Datos):**
   - Google Play rechaza cualquier app con registro de usuarios que no tenga eliminación de cuenta dentro y fuera de la app. Ya creamos e integramos todo:
     - **Dentro de la App:** En *Perfil > Ajustes > Eliminar Cuenta Permanentemente* + enlace a Política de Privacidad.
     - **URL de Política de Privacidad (para pegar en Play Console):** `https://barrzjuego.com/privacidad` (o `https://barrzjuego.com/privacidad.html`)
     - **URL de Eliminación de Cuenta (para pegar en Play Console > Seguridad de los Datos):** `https://barrzjuego.com/eliminar-cuenta` (o `https://barrzjuego.com/eliminar-cuenta.html`)

4. **Paquetes de Producción Compilados y Firmados:**
   - **Para subir a Google Play Store (`.aab`):**
     `android/app/build/outputs/bundle/release/app-release.aab`
   - **Para instalar directo en celulares de prueba (`.apk`):**
     `android/app/build/outputs/apk/release/app-release.apk`

---

## 💼 PARTE 2: QUÉ DEBES HABLAR CON TUS CLIENTES (COSTOS, CUENTAS Y TIEMPOS)

Como tienes **lo que queda de este mes (20 días)** para entregar la app publicada, esto es exactamente lo que debes definir con tus clientes **hoy mismo**:

### 💰 1. ¿Qué hay que pagar?
1. **Cuenta de Desarrollador de Google Play Console:**
   - **Costo:** **\$25 USD (Pago único de por vida)** pagado directamente a Google con tarjeta de crédito/débito internacional en [play.google.com/console](https://play.google.com/console).
   - No existen cobros mensuales ni anuales por parte de Google Play.
2. **Servidor Web, Base de Datos y Dominio (`barrzjuego.com`):**
   - Es el mismo servidor que ya tienen operativo. Gracias a este servidor funciona el sistema de parches en vivo sin tener que volver a pasar por revisiones de la tienda.

---

### ⏳ 2. ¿Cuánto tiempo tarda el proceso en Google Play? (¡CRÍTICO PARA LLEGAR A FIN DE MES!)

El tiempo depende del **tipo de cuenta de Google Play Console** que se utilice. Pregúntale al cliente cuál de estos 3 casos aplica:

| Escenario | ¿Requiere 14 días de prueba cerrada? | Tiempo de verificación + revisión | Tiempo Total hasta estar pública | ¿Llega antes de fin de mes? |
| :--- | :---: | :---: | :---: | :---: |
| **Caso A: Cuenta Personal existente** (creada antes de Nov 2023) | ❌ **NO** | 2 a 5 días hábiles | **3 a 5 días** | ✅ **SÍ, de sobra** |
| **Caso B: Cuenta de Empresa / Organización** (con número DUNS activo) | ❌ **NO** | 2 a 4 días (verificación) + 2 a 4 días (revisión) | **4 a 8 días** | ✅ **SÍ, holgadamente** |
| **Caso C: Cuenta Personal NUEVA** (creada hoy como persona física) | ⚠️ **SÍ (12 testers por 14 días continuos)** | 1-2 días (DNI) + **14 días (prueba)** + 2-4 días (revisión final) | **17 a 20 días** | ⚠️ **JUSTO A TIEMPO (Hay que iniciarla entre hoy y mañana)** |

#### 💡 ¿Qué decirle al cliente sobre los tiempos?
- Si vamos a usar una **Cuenta Personal Nueva (Caso C)**:
  1. Deben pagar los **\$25 USD** y subir la foto del DNI/Pasaporte en Google Play Console **entre hoy y mañana**.
  2. Apenas Google apruebe la identidad (suele tardar 24h), subimos el archivo `app-release.aab` que ya está listo a la pista de **Prueba Cerrada**.
  3. Necesitaremos una lista de **12 correos `@gmail.com`** (pueden ser del cliente, socios, amigos y tuyos) que acepten el link de invitación e instalen la app en sus teléfonos Android, manteniéndola instalada durante **14 días seguidos**.
  4. Mientras corren esos 14 días, el cliente y su equipo **ya tendrán la app instalada y descargada desde Google Play Store** en sus teléfonos, y al cumplirse el día 14 se pulsa el botón **"Solicitar acceso a Producción"** para que quede abierta a todo el mundo.

---

## 📋 PARTE 3: TU CHECKLIST PASO A PASO (LO QUE TE TOCA HACER A TI)

### Paso 1: Subir los últimos cambios a GitHub / Servidor
Ejecuta estos comandos para que `barrzjuego.com` tenga activas las páginas `/privacidad` y `/eliminar-cuenta` que revisará Google:
```powershell
git add .
git commit -m "Preparacion oficial Google Play Store, OTA y paginas de privacidad/eliminacion"
git push origin main
```

### Paso 2: Registrar el SHA-1 en Google Cloud y Spotify Developers
Para que el botón **"Continuar con Google"** y **Spotify** funcionen en el `.aab` firmado:
1. Ve a [Google Cloud Console > Credenciales](https://console.cloud.google.com/apis/credentials).
2. Crea o edita el **ID de cliente OAuth para Android** con:
   - **Nombre del paquete:** `com.barrz.freestyle`
   - **Huella digital del certificado SHA-1:** `E1:F7:D4:85:63:63:97:FF:18:4E:CF:E7:36:5F:AF:39:07:C4:06:69`
3. *(Cuando subas la app a Google Play Console, ve a **Configuración > Integridad de la aplicación > Firma de aplicaciones de Play**, copia también el SHA-1 que genera Google Play y agrégalo como segundo cliente Android en Google Cloud y en el Dashboard de Spotify).*
4. En [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), en la configuración de tu app, verifica que en **Android Packages** esté registrado `com.barrz.freestyle` con ese mismo SHA-1, y en **Redirect URIs** estén:
   - `https://barrzjuego.com/api/spotify/callback`
   - `barrz://spotify-callback`
   - `com.barrz.freestyle://spotify-callback`

### Paso 3: Configurar la Ficha en Google Play Console
Cuando entres a Google Play Console y pulses **"Crear aplicación"**:
1. **Nombre de la app:** `Barrz Freestyle`
2. **Idioma predeterminado:** Español (España o Latinoamérica)
3. **Aplicación o Juego:** `Juego` (Categoría: *Música* o *Cartas*)
4. **Gratis o de pago:** `Gratis`
5. **Política de Privacidad:** Pega `https://barrzjuego.com/privacidad`
6. **Acceso a la aplicación (Credenciales para el revisor de Google):**
   - Selecciona *"Todas o algunas funciones están restringidas"*.
   - Añade una instrucción para el revisor de Google:
     - **Usuario de prueba:** *(Crea una cuenta de correo/contraseña de prueba en la app, ej. `test@barrzjuego.com` / `BarrzTest123`, o indícales que también pueden pulsar "Jugar sin conexión (Modo Invitado)")*.
7. **Seguridad de los Datos (Data Safety):**
   - ¿Recopila o comparte datos? **Sí**.
   - ¿Están cifrados en tránsito? **Sí**.
   - ¿Ofreces una forma de solicitar la eliminación de la cuenta? **Sí** -> Pega la URL: `https://barrzjuego.com/eliminar-cuenta`
   - Datos recopilados que debes marcar:
     - *Información personal > Nombre / Alias y Dirección de correo electrónico* (Para funcionamiento de la aplicación y gestión de la cuenta).
     - *Actividad en la aplicación > Interacciones y progreso de juego* (Para funcionamiento de la aplicación).
8. **Clasificación de contenido (IARC):**
   - Rellena el cuestionario indicando que es un juego de improvisación musical/rap sin violencia gráfica, sin apuestas con dinero real ni compras integradas.
9. **Recursos gráficos para la Ficha de Play Store:**
   - **Ícono de la app:** 512 x 512 px (PNG).
   - **Gráfico de funciones (Banner):** 1024 x 500 px (PNG/JPG).
   - **Capturas de pantalla:** Mínimo 2 a 4 capturas verticales del juego en el teléfono (Splash, Selección de Modo, Carta de Desafío y Reproductor de Beat).
10. **Subir el paquete `.aab`:**
    - En *Producción* (o *Prueba cerrada*), crea una nueva versión y arrastra el archivo:
      `c:\Users\Luismishit\Pictures\PROTOTIPO\android\app\build\outputs\bundle\release\app-release.aab`
