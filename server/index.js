const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'barrzjuego_super_secret_key_123';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Helper: generate 6-digit random code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: obtener estadísticas e historial real de un usuario
const getUserProfileData = async (userId) => {
  try {
    // 1. Calcular estadísticas agrupadas
    const statsRes = await db.query(
      `SELECT 
         COUNT(*)::int as total_battles,
         COUNT(CASE WHEN result = 'win' THEN 1 END)::int as wins,
         COALESCE(MAX(points), 0)::int as max_points
       FROM game_history 
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = statsRes.rows[0];
    const totalBattles = stats.total_battles || 0;
    const wins = stats.wins || 0;
    const maxPoints = stats.max_points || 0;
    const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;

    // 2. Obtener historial reciente (últimas 10 partidas)
    const historyRes = await db.query(
      `SELECT id, mode, rounds_count, points, result, player_rank, players, scores, details, battle_date
       FROM game_history
       WHERE user_id = $1
       ORDER BY battle_date DESC
       LIMIT 10`,
      [userId]
    );

    return {
      stats: {
        totalBattles,
        wins,
        winRate,
        maxPoints
      },
      history: historyRes.rows.map(row => ({
        id: row.id,
        mode: row.mode,
        roundsCount: row.rounds_count,
        points: row.points,
        result: row.result,
        playerRank: row.player_rank,
        players: row.players ? JSON.parse(row.players) : [],
        scores: row.scores ? JSON.parse(row.scores) : {},
        details: row.details ? JSON.parse(row.details) : [],
        battleDate: row.battle_date
      }))
    };
  } catch (err) {
    console.error('Error al obtener datos de perfil del usuario:', err);
    return {
      stats: { totalBattles: 0, wins: 0, winRate: 0, maxPoints: 0 },
      history: []
    };
  }
};

// --- ENDPOINTS DE API ---

// 1. Enviar código de verificación por correo
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Correo electrónico es requerido.' });
  }

  try {
    // Verificar si el usuario ya está registrado
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    const code = generateCode();

    // Eliminar códigos antiguos para este email
    await db.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    // Insertar nuevo código
    await db.query('INSERT INTO verification_codes (email, code) VALUES ($1, $2)', [email, code]);

    // Registrar en consola para depuración
    console.log(`\n=============================================`);
    console.log(`[CÓDIGO DE VERIFICACIÓN]`);
    console.log(`Email: ${email}`);
    console.log(`Código: ${code}`);
    console.log(`=============================================\n`);

    // Llamar al Google Apps Script para enviar el correo si está configurado
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;
    const EMAIL_FROM_ALIAS = process.env.EMAIL_FROM_ALIAS;

    if (APPS_SCRIPT_URL) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            code,
            secret: APPS_SCRIPT_SECRET,
            fromAlias: EMAIL_FROM_ALIAS
          })
        });
        const result = await response.json();
        if (!result.success) {
          console.error('Error al enviar correo por Apps Script:', result.error);
        } else {
          console.log('Correo enviado con éxito por Google Apps Script.');
        }
      } catch (err) {
        console.error('Error al conectar con Google Apps Script:', err);
      }
    } else {
      console.log('Aviso: APPS_SCRIPT_URL no está configurado. El correo de verificación no se envió.');
    }

    res.json({ 
      success: true, 
      message: 'Código de verificación enviado.'
    });
  } catch (err) {
    console.error('Error al enviar código:', err);
    res.status(500).json({ error: 'Error del servidor al generar código.' });
  }
});

// 2. Registrar usuario (Crear Cuenta)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, code } = req.body;
  if (!email || !password || !code) {
    return res.status(400).json({ error: 'Todos los campos (email, contraseña, código) son requeridos.' });
  }

  try {
    // Validar código de verificación
    const codeRes = await db.query('SELECT * FROM verification_codes WHERE email = $1 AND code = $2', [email, code]);
    if (codeRes.rows.length === 0) {
      return res.status(400).json({ error: 'Código de verificación incorrecto o expirado.' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generar nombre de usuario por defecto
    const emailPrefix = email.split('@')[0];
    const defaultUsername = emailPrefix.slice(0, 15) + '_' + Math.floor(100 + Math.random() * 900);

    // Crear usuario con campos por defecto
    const newUserRes = await db.query(
      'INSERT INTO users (email, password_hash, username, avatar, avatar_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, avatar, avatar_type',
      [email, passwordHash, defaultUsername, 'crown', 'preset']
    );

    const user = newUserRes.rows[0];

    // Eliminar código usado
    await db.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    // Firmar JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      avatar_type: user.avatar_type,
      loggedIn: true,
      method: 'email'
    });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    if (err.code === '23505') { // Código de error de llave duplicada en PostgreSQL
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }
    res.status(500).json({ error: 'Error del servidor al registrar.' });
  }
});

// 3. Iniciar Sesión (Login)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    // Buscar usuario
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const user = userRes.rows[0];

    // Si el usuario no tiene nombre de usuario, generarlo
    if (!user.username) {
      const emailPrefix = user.email.split('@')[0];
      const defaultUsername = emailPrefix.slice(0, 15) + '_' + Math.floor(100 + Math.random() * 900);
      await db.query('UPDATE users SET username = $1 WHERE id = $2', [defaultUsername, user.id]);
      user.username = defaultUsername;
    }

    // Si es un usuario de Google que no tiene contraseña
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Esta cuenta usa inicio de sesión con Google.' });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Firmar JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Obtener estadísticas e historial reales
    const profileData = await getUserProfileData(user.id);

    res.json({
      success: true,
      token,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      avatar_type: user.avatar_type,
      custom_avatar_url: user.custom_avatar_url,
      stats: profileData.stats,
      history: profileData.history,
      loggedIn: true,
      method: 'email'
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ error: 'Error del servidor al iniciar sesión.' });
  }
});

// 4. Validar Token de Sesión
app.get('/api/auth/verify-token', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Obtener perfil completo
    const userRes = await db.query(
      'SELECT id, email, username, avatar, avatar_type, custom_avatar_url FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }
    const user = userRes.rows[0];

    // Si el usuario no tiene nombre de usuario, generarlo
    if (!user.username) {
      const emailPrefix = user.email.split('@')[0];
      const defaultUsername = emailPrefix.slice(0, 15) + '_' + Math.floor(100 + Math.random() * 900);
      await db.query('UPDATE users SET username = $1 WHERE id = $2', [defaultUsername, user.id]);
      user.username = defaultUsername;
    }

    // Obtener estadísticas e historial reales
    const profileData = await getUserProfileData(user.id);

    res.json({
      success: true,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      avatar_type: user.avatar_type,
      custom_avatar_url: user.custom_avatar_url,
      stats: profileData.stats,
      history: profileData.history
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
});

// 5. Google Login (Verificación del token JWT de Google)
app.post('/api/auth/google-login', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Falta la credencial de Google.' });
  }

  try {
    // Llamar al endpoint oficial de Google para verificar el token JWT (ID Token)
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await googleRes.json();

    if (!googleRes.ok || payload.error_description) {
      return res.status(400).json({ error: 'Token de Google inválido o expirado.' });
    }

    const { email, sub: googleId, aud } = payload;

    // Opcional: Validar client ID si está configurado en las variables de entorno del servidor
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (GOOGLE_CLIENT_ID && aud !== GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'El ID de cliente de Google no coincide con el de esta aplicación.' });
    }

    if (!email) {
      return res.status(400).json({ error: 'No se pudo obtener el correo de la cuenta de Google.' });
    }

    // Buscar si ya existe por google_id o por email
    let userRes = await db.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);
    let user;

    if (userRes.rows.length === 0) {
      // Generar nombre de usuario por defecto
      const emailPrefix = email.split('@')[0];
      const defaultUsername = emailPrefix.slice(0, 15) + '_' + Math.floor(100 + Math.random() * 900);

      // Crear nuevo usuario de Google con campos por defecto
      const insertRes = await db.query(
        'INSERT INTO users (email, google_id, username, avatar, avatar_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, avatar, avatar_type',
        [email, googleId, defaultUsername, 'crown', 'preset']
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
      // Si el usuario existía por email pero no tenía google_id, asociarlo
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
        user.google_id = googleId;
      }
      // Si el usuario no tiene nombre de usuario, generarlo
      if (!user.username) {
        const emailPrefix = email.split('@')[0];
        const defaultUsername = emailPrefix.slice(0, 15) + '_' + Math.floor(100 + Math.random() * 900);
        await db.query('UPDATE users SET username = $1 WHERE id = $2', [defaultUsername, user.id]);
        user.username = defaultUsername;
      }
    }

    // Obtener los datos completos
    const userProfileRes = await db.query(
      'SELECT id, email, username, avatar, avatar_type, custom_avatar_url FROM users WHERE id = $1',
      [user.id]
    );
    const fullUser = userProfileRes.rows[0];

    // Firmar JWT propio de la App
    const token = jwt.sign({ id: fullUser.id, email: fullUser.email }, JWT_SECRET, { expiresIn: '7d' });

    // Obtener estadísticas e historial reales
    const profileData = await getUserProfileData(fullUser.id);

    res.json({
      success: true,
      token,
      email: fullUser.email,
      username: fullUser.username,
      avatar: fullUser.avatar,
      avatar_type: fullUser.avatar_type,
      custom_avatar_url: fullUser.custom_avatar_url,
      stats: profileData.stats,
      history: profileData.history,
      loggedIn: true,
      method: 'google'
    });
  } catch (err) {
    console.error('Error en login con Google:', err);
    res.status(500).json({ error: 'Error del servidor en autenticación de Google.' });
  }
});

// 6. Actualizar Perfil de Usuario
app.post('/api/auth/update-profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { username, avatar, avatar_type, custom_avatar_url } = req.body;

    if (username && username.trim().length < 3) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }

    // Actualizar usuario en la base de datos
    await db.query(
      `UPDATE users 
       SET username = COALESCE($1, username), 
           avatar = COALESCE($2, avatar), 
           avatar_type = COALESCE($3, avatar_type), 
           custom_avatar_url = $4 
       WHERE id = $5`,
      [username, avatar, avatar_type, custom_avatar_url, decoded.id]
    );

    // Obtener los datos actualizados
    const userRes = await db.query(
      'SELECT id, email, username, avatar, avatar_type, custom_avatar_url FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = userRes.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        avatar_type: user.avatar_type,
        custom_avatar_url: user.custom_avatar_url
      }
    });
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
});

// 7. Guardar Partida Finalizada
app.post('/api/auth/save-game', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { mode, roundsCount, points, result, playerRank, players, scores, details } = req.body;

    if (!mode || points === undefined || !result) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos de la partida.' });
    }

    // Insertar partida en la tabla de historial
    await db.query(
      `INSERT INTO game_history (user_id, mode, rounds_count, points, result, player_rank, players, scores, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        decoded.id,
        mode,
        roundsCount,
        points,
        result,
        playerRank || null,
        players ? JSON.stringify(players) : null,
        scores ? JSON.stringify(scores) : null,
        details ? JSON.stringify(details) : null
      ]
    );

    // Obtener las estadísticas e historial actualizados
    const profileData = await getUserProfileData(decoded.id);

    res.json({
      success: true,
      message: 'Partida guardada con éxito.',
      stats: profileData.stats,
      history: profileData.history
    });
  } catch (err) {
    console.error('Error al guardar partida:', err);
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
});

// 8. SPOTIFY INTEGRATION — AUTHENTICATION ROUTING

// Endpoint para iniciar la autenticación de Spotify
app.get('/api/spotify/login', (req, res) => {
  const userToken = req.query.state; // Pasamos el JWT de la app para saber a qué usuario asociar
  if (!userToken) {
    return res.status(400).send('Falta token de usuario.');
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/spotify/callback';
  
  if (!client_id) {
    return res.status(500).send('Error: SPOTIFY_CLIENT_ID no configurado en el servidor.');
  }

  // Permisos necesarios para interactuar con el reproductor de Spotify
  const scope = 'user-modify-playback-state user-read-playback-state user-read-currently-playing';

  // Redirigir a la pantalla de autorización de Spotify
  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: userToken // Enviamos el JWT como state
  });

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams.toString()}`);
});

// Callback de Spotify
app.get('/api/spotify/callback', async (req, res) => {
  const code = req.query.code || null;
  const userToken = req.query.state || null;

  if (!code || !userToken) {
    return res.status(400).send('Faltan parámetros de autenticación.');
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/spotify/callback';

  if (!client_id || !client_secret) {
    return res.status(500).send('Credenciales de Spotify incompletas en el servidor.');
  }

  try {
    // Decodificar usuario desde el JWT provisto en el state
    const decoded = jwt.verify(userToken, JWT_SECRET);
    const userId = decoded.id;

    // Intercambiar el código de autorización por tokens
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error('Error al obtener tokens de Spotify:', tokenData);
      return res.status(400).send('Error al conectar con Spotify.');
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Guardar tokens de Spotify en la tabla de usuarios
    await db.query(
      `UPDATE users 
       SET spotify_access_token = $1, 
           spotify_refresh_token = $2, 
           spotify_token_expires_at = $3 
       WHERE id = $4`,
      [access_token, refresh_token, expiresAt, userId]
    );

    // Redirigir de regreso al frontend indicando éxito
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?spotify_success=true`);
  } catch (err) {
    console.error('Error en Spotify Callback:', err);
    res.status(500).send('Error de autenticación.');
  }
});

// Obtener estado/vinculación de Spotify del usuario actual
app.get('/api/spotify/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await db.query(
      'SELECT spotify_refresh_token FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = userRes.rows[0];

    res.json({
      linked: !!(user && user.spotify_refresh_token)
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido.' });
  }
});

// Helper: Refrescar token de Spotify si es necesario
const getOrRefreshSpotifyToken = async (userId) => {
  const userRes = await db.query(
    'SELECT spotify_access_token, spotify_refresh_token, spotify_token_expires_at FROM users WHERE id = $1',
    [userId]
  );
  
  if (userRes.rows.length === 0) {
    throw new Error('Usuario no encontrado.');
  }

  const { spotify_access_token, spotify_refresh_token, spotify_token_expires_at } = userRes.rows[0];

  if (!spotify_refresh_token) {
    throw new Error('Spotify no está vinculado en esta cuenta.');
  }

  // Si el token aún es válido (más de 1 minuto de margen), devolverlo
  if (spotify_access_token && spotify_token_expires_at && new Date(spotify_token_expires_at) > new Date(Date.now() + 60000)) {
    return spotify_access_token;
  }

  // Si expiró o está a punto de expirar, refrescar
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
       'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
     },
     body: new URLSearchParams({
       grant_type: 'refresh_token',
       refresh_token: spotify_refresh_token
     }).toString()
  });

  const refreshData = await refreshRes.json();
  if (!refreshRes.ok || refreshData.error) {
    console.error('Error al refrescar token de Spotify:', refreshData);
    throw new Error('No se pudo refrescar el token de Spotify.');
  }

  const newAccessToken = refreshData.access_token;
  const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

  // Actualizar en base de datos
  await db.query(
    `UPDATE users 
     SET spotify_access_token = $1, 
         spotify_token_expires_at = $2 
     WHERE id = $3`,
    [newAccessToken, expiresAt, userId]
  );

  return newAccessToken;
};

// Controlar el reproductor de Spotify (Play/Pause/Skip)
app.post('/api/spotify/control', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];
  const { action, uri } = req.body; // action: 'play' | 'pause', uri: spotify track uri

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // Obtener token válido de Spotify
    const spotifyToken = await getOrRefreshSpotifyToken(userId);

    let spotifyEndpoint = 'https://api.spotify.com/v1/me/player/pause';
    let method = 'PUT';
    let body = null;

    if (action === 'play') {
      spotifyEndpoint = 'https://api.spotify.com/v1/me/player/play';
      if (uri) {
        body = JSON.stringify({ uris: [uri] });
      }
    }

    const spotifyRes = await fetch(spotifyEndpoint, {
      method: method,
      headers: {
        'Authorization': `Bearer ${spotifyToken}`,
        'Content-Type': 'application/json'
      },
      body: body
    });

    if (spotifyRes.status === 404) {
       return res.status(404).json({ error: 'No se detectó un dispositivo activo en tu cuenta de Spotify. Abre la app de Spotify y dale Play para activarlo.' });
    }

    if (spotifyRes.status === 403) {
       return res.status(403).json({ error: 'Se requiere una suscripción Premium de Spotify para controlar el reproductor desde juegos externos.' });
    }

    if (!spotifyRes.ok) {
       const errData = await spotifyRes.json().catch(() => ({}));
       console.error('Error controlando Spotify:', errData);
       return res.status(400).json({ error: 'Error al enviar comando a Spotify.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error en Spotify control endpoint:', err);
    res.status(500).json({ error: err.message || 'Error del servidor en Spotify control.' });
  }
});




// --- SERVICIO DE ARCHIVOS ESTÁTICOS EN PRODUCCIÓN ---

// Servir la compilación de producción del cliente
app.use(express.static(path.join(__dirname, '../dist')));

// Ruta comodín para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Iniciar servidor e inicializar base de datos
app.listen(PORT, async () => {
  console.log(`\nServidor corriendo en el puerto: ${PORT}`);
  
  // Opcional: Ejecutar scripts de creación de tablas
  try {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await db.query(schemaSql);
      console.log('Tablas inicializadas correctamente en la base de datos.');
    }
  } catch (err) {
    console.error('Error al inicializar las tablas de la base de datos:', err);
  }
});
