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

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

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

// Helper: Consultar y guardar perfil completo de Spotify
const fetchAndSaveSpotifyProfile = async (userId, accessToken) => {
  try {
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      const spotifyDisplayName = meData.display_name || meData.id || 'Usuario Spotify';
      const spotifyEmail = meData.email || null;
      const spotifyProduct = meData.product || 'free';
      const spotifyAvatarUrl = (meData.images && meData.images.length > 0) ? meData.images[0].url : null;

      await db.query(
        `UPDATE users 
         SET spotify_display_name = $1, 
             spotify_email = $2, 
             spotify_product = $3, 
             spotify_avatar_url = $4 
         WHERE id = $5`,
        [spotifyDisplayName, spotifyEmail, spotifyProduct, spotifyAvatarUrl, userId]
      );

      return {
        display_name: spotifyDisplayName,
        email: spotifyEmail,
        product: spotifyProduct,
        avatar_url: spotifyAvatarUrl
      };
    }
  } catch (err) {
    console.error('Error al sincronizar perfil de Spotify:', err);
  }
  return null;
};

// Helper: Refrescar token de Spotify si es necesario
const spotifyRefreshPromises = new Map();

const getOrRefreshSpotifyToken = async (userId) => {
  if (spotifyRefreshPromises.has(userId)) {
    return spotifyRefreshPromises.get(userId);
  }

  const promise = (async () => {
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

    if (!client_id || !client_secret) {
      throw new Error('Credenciales de Spotify no configuradas en el servidor.');
    }

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
      console.error(`[SPOTIFY REFRESH ERROR] Usuario ${userId}:`, refreshData);
      
      // Si el error es invalid_grant (token revocado en Spotify), limpiar en DB para no dejar estado corrupto
      if (refreshData.error === 'invalid_grant') {
        console.warn(`[SPOTIFY] Refresh token revocado para usuario ${userId}. Limpiando vinculación.`);
        await db.query(
          `UPDATE users 
           SET spotify_access_token = NULL, 
               spotify_refresh_token = NULL, 
               spotify_token_expires_at = NULL,
               spotify_display_name = NULL,
               spotify_email = NULL,
               spotify_product = NULL,
               spotify_avatar_url = NULL
           WHERE id = $1`,
          [userId]
        );
      }
      throw new Error('No se pudo refrescar el token de Spotify: ' + (refreshData.error_description || refreshData.error));
    }

    const newAccessToken = refreshData.access_token;
    const newRefreshToken = refreshData.refresh_token || spotify_refresh_token;
    const expiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000);

    // Actualizar en base de datos conservando o actualizando el refresh_token
    await db.query(
      `UPDATE users 
       SET spotify_access_token = $1, 
           spotify_refresh_token = $2, 
           spotify_token_expires_at = $3 
       WHERE id = $4`,
      [newAccessToken, newRefreshToken, expiresAt, userId]
    );

    return newAccessToken;
  })();

  spotifyRefreshPromises.set(userId, promise);
  try {
    return await promise;
  } finally {
    spotifyRefreshPromises.delete(userId);
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
      [email, passwordHash, defaultUsername, '', 'preset']
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
      spotify_linked: false,
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
      spotify_linked: Boolean(user.spotify_refresh_token),
      spotify_user: user.spotify_refresh_token ? {
        display_name: user.spotify_display_name,
        email: user.spotify_email,
        product: user.spotify_product,
        avatar_url: user.spotify_avatar_url
      } : null,
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
      'SELECT id, email, username, avatar, avatar_type, custom_avatar_url, spotify_refresh_token, spotify_display_name, spotify_email, spotify_product, spotify_avatar_url FROM users WHERE id = $1',
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

    // Auto-sincronizar perfil de Spotify si está vinculado pero no tiene los datos guardados
    let spotifyUserObj = null;
    if (user.spotify_refresh_token) {
      if (user.spotify_display_name) {
        spotifyUserObj = {
          display_name: user.spotify_display_name,
          email: user.spotify_email,
          product: user.spotify_product,
          avatar_url: user.spotify_avatar_url
        };
      } else {
        try {
          const accessToken = await getOrRefreshSpotifyToken(user.id);
          spotifyUserObj = await fetchAndSaveSpotifyProfile(user.id, accessToken);
        } catch (e) {
          console.warn('No se pudo sincronizar perfil de Spotify en verify-token:', e.message);
        }
      }
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
      spotify_linked: Boolean(user.spotify_refresh_token),
      spotify_user: spotifyUserObj,
      stats: profileData.stats,
      history: profileData.history
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
});

// Endpoint para proveer el Client ID público configurado en Railway
app.get('/api/auth/google-config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID_APP || '';
  res.json({ clientId });
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

    const { email, sub: googleId, aud, azp } = payload;

    // Validar client ID si está configurado en las variables de entorno del servidor
    const allowedClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID_APP,
      '103522205562-b9r1r76scj8g7btrhfs8a209t7h6j3s1.apps.googleusercontent.com'
    ].filter(Boolean);

    if (allowedClientIds.length > 0) {
      const isMatch = allowedClientIds.includes(aud) || (azp && allowedClientIds.includes(azp));
      if (!isMatch) {
        console.warn('ID de cliente de Google diferente de los esperados:', { aud, azp, allowedClientIds });
      }
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
        [email, googleId, defaultUsername, '', 'preset']
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
      'SELECT id, email, username, avatar, avatar_type, custom_avatar_url, spotify_refresh_token, spotify_display_name, spotify_email, spotify_product, spotify_avatar_url FROM users WHERE id = $1',
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
      spotify_linked: Boolean(fullUser.spotify_refresh_token),
      spotify_user: fullUser.spotify_refresh_token ? {
        display_name: fullUser.spotify_display_name,
        email: fullUser.spotify_email,
        product: fullUser.spotify_product,
        avatar_url: fullUser.spotify_avatar_url
      } : null,
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

// 8. SPOTIFY INTEGRATION — AUTHENTICATION & WEB PLAYBACK SDK ROUTING

// Endpoint para iniciar la autenticación de Spotify
app.get('/api/spotify/login', (req, res) => {
  const userToken = req.query.state; // JWT de la app para asociar con la cuenta
  if (!userToken) {
    return res.status(400).send('Falta token de usuario.');
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback';
  
  if (!client_id) {
    return res.status(500).send('Error: SPOTIFY_CLIENT_ID no configurado en el servidor.');
  }

  // Permisos completos para Web Playback SDK y control del reproductor
  const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state user-read-currently-playing app-remote-control';

  // Redirigir a la pantalla de autorización de Spotify solicitando confirmación explícita
  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: userToken,
    show_dialog: 'true'
  });

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams.toString()}`);
});

// Callback de Spotify
app.get('/api/spotify/callback', async (req, res) => {
  const code = req.query.code || null;
  const rawState = req.query.state || '';
  const error = req.query.error || null;
  const frontendUrl = process.env.FRONTEND_URL || 'https://barrzjuego.com';
  
  const isApp = (rawState || '').includes(':app');
  const userToken = (rawState || '').replace(':app', '');

  const sendResponse = (params) => {
    if (isApp) {
      const appUrl = `${frontendUrl}/?${params}`;
      const localUrl = `https://localhost/?${params}`;
      const deepLink = `com.barrz.freestyle://spotify?${params}`;
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta http-equiv="refresh" content="0;url=${appUrl}">
          <title>BARRZ Freestyle - Spotify</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              background: #0a0a14;
              color: #ffffff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
              text-align: center;
            }
            .card {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid #1DB954;
              border-radius: 16px;
              padding: 30px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 0 25px rgba(29, 185, 84, 0.3);
            }
            .logo {
              width: 64px;
              height: 64px;
              margin-bottom: 16px;
            }
            h2 {
              margin: 0 0 10px 0;
              color: #1DB954;
              font-size: 1.4rem;
            }
            p {
              color: #aaa;
              font-size: 0.95rem;
              line-height: 1.4;
              margin-bottom: 24px;
            }
            .btn {
              display: inline-block;
              background: #1DB954;
              color: #000;
              font-weight: bold;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 30px;
              font-size: 1rem;
              box-shadow: 0 0 15px rgba(29, 185, 84, 0.4);
            }
          </style>
          <script>
            // Redirigir de inmediato al origen de la app
            var target = (window.location.href.indexOf('localhost') !== -1) ? "${localUrl}" : "${appUrl}";
            try {
              window.location.replace(target);
            } catch(e) {
              window.location.href = target;
            }
            setTimeout(function() {
              try {
                window.location.href = "${deepLink}";
              } catch(e) {}
              var btn = document.getElementById('open-app-btn');
              if (btn) btn.style.display = 'inline-block';
            }, 800);
          </script>
        </head>
        <body>
          <div class="card">
            <svg class="logo" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.31c-.22.36-.68.48-1.04.26-2.91-1.78-6.58-2.18-10.9-1.2-.42.09-.83-.17-.92-.59-.09-.41.17-.83.59-.92 4.73-1.08 8.78-.62 12.01 1.36.36.21.48.67.26 1.09zm1.46-3.26c-.28.45-.87.6-1.32.32-3.33-2.05-8.41-2.65-12.35-1.45-.51.15-1.04-.14-1.2-.66-.15-.51.14-1.04.66-1.2 4.51-1.37 10.12-.7 13.9 1.63.45.27.6.86.31 1.36zm.1-3.38C15.2 8.35 8.86 8.14 5.17 9.26c-.57.17-1.16-.16-1.33-.73-.17-.57.16-1.16.73-1.33 4.23-1.28 11.23-1.04 15.67 1.59.51.3 1.17.47 1.47-.04.3-.51.13-1.17-.38-1.47z"/>
            </svg>
            <h2>¡Cuenta de Spotify Vinculada!</h2>
            <p>Regresando a Barrz Freestyle...</p>
            <a id="open-app-btn" class="btn" href="${appUrl}" onclick="window.location.replace('${appUrl}'); window.location.href='${deepLink}';">VOLVER A LA APP</a>
          </div>
        </body>
        </html>
      `);
    }
    return res.redirect(`${frontendUrl}?${params}`);
  };

  if (error || !code || !userToken) {
    console.error('Spotify auth error or cancelled:', error);
    return sendResponse(`spotify_error=${encodeURIComponent(error || 'cancelled')}`);
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback';

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
      return sendResponse('spotify_error=token_exchange_failed');
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

    // Obtener y guardar información del perfil del usuario de Spotify
    await fetchAndSaveSpotifyProfile(userId, access_token);

    // Redirigir de regreso al frontend indicando éxito y conservando la sesión
    return sendResponse(`spotify_success=true&token=${encodeURIComponent(userToken)}`);
  } catch (err) {
    console.error('Error en Spotify Callback:', err);
    return sendResponse(`spotify_error=${encodeURIComponent(err.message || 'server_auth_error')}`);
  }
});

// Desvincular Spotify de la cuenta de usuario de forma explícita
app.post('/api/spotify/unlink', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await db.query(
      `UPDATE users 
       SET spotify_access_token = NULL, 
           spotify_refresh_token = NULL, 
           spotify_token_expires_at = NULL,
           spotify_display_name = NULL,
           spotify_email = NULL,
           spotify_product = NULL,
           spotify_avatar_url = NULL 
       WHERE id = $1`,
      [decoded.id]
    );

    res.json({ success: true, linked: false });
  } catch (err) {
    console.error('Error al desvincular Spotify:', err);
    res.status(500).json({ error: 'Error del servidor al desvincular Spotify.' });
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
      'SELECT id, spotify_refresh_token, spotify_display_name, spotify_email, spotify_product, spotify_avatar_url FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = userRes.rows[0];

    let spotifyUserData = null;
    if (user && user.spotify_refresh_token) {
      if (user.spotify_display_name) {
        spotifyUserData = {
          display_name: user.spotify_display_name,
          email: user.spotify_email,
          product: user.spotify_product,
          avatar_url: user.spotify_avatar_url
        };
      } else {
        try {
          const accessToken = await getOrRefreshSpotifyToken(user.id);
          spotifyUserData = await fetchAndSaveSpotifyProfile(user.id, accessToken);
        } catch (e) {
          console.warn('No se pudo recuperar perfil de Spotify en status:', e.message);
        }
      }
    }

    res.json({
      linked: !!(user && user.spotify_refresh_token),
      spotify_user: spotifyUserData
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido.' });
  }
});

// Endpoint para que el SDK del frontend obtenga el token de acceso de Spotify
app.get('/api/spotify/token', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const accessToken = await getOrRefreshSpotifyToken(decoded.id);
    res.json({ access_token: accessToken });
  } catch (err) {
    console.error('Error al obtener token de Spotify:', err.message);
    res.status(400).json({ error: err.message || 'Error al obtener token de Spotify.' });
  }
});

// Obtener lista de dispositivos Spotify activos
app.get('/api/spotify/devices', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const spotifyToken = await getOrRefreshSpotifyToken(decoded.id);

    const devRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${spotifyToken}` }
    });
    const data = await devRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Controlar el reproductor de Spotify (Play/Pause/Transfer)
app.post('/api/spotify/control', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];
  const { action, uri, device_id, position_ms } = req.body;

  console.log(`\n🎵 [SPOTIFY CONTROL REQUEST] Action: "${action}" | URI: "${uri}" | Device: "${device_id || 'default'}"`);

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
      if (device_id) {
        spotifyEndpoint += `?device_id=${encodeURIComponent(device_id)}`;
      }
      const playBody = {};
      if (uri) {
        playBody.uris = [uri];
      }
      if (position_ms !== undefined) {
        playBody.position_ms = position_ms;
      }
      body = Object.keys(playBody).length > 0 ? JSON.stringify(playBody) : null;
    } else if (action === 'pause') {
      spotifyEndpoint = 'https://api.spotify.com/v1/me/player/pause';
      if (device_id) {
        spotifyEndpoint += `?device_id=${encodeURIComponent(device_id)}`;
      }
    } else if (action === 'transfer') {
      spotifyEndpoint = 'https://api.spotify.com/v1/me/player';
      body = JSON.stringify({ device_ids: [device_id], play: false });
    }

    let spotifyRes = await fetch(spotifyEndpoint, {
      method: method,
      headers: {
        'Authorization': `Bearer ${spotifyToken}`,
        'Content-Type': 'application/json'
      },
      body: body
    });

    console.log(`[SPOTIFY API] Response status from ${spotifyEndpoint}: ${spotifyRes.status}`);

    if (spotifyRes.status === 404 && action === 'play') {
      try {
        const devRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        const devData = await devRes.json();
        console.log('[SPOTIFY DEVICES AVAILABLE]:', devData?.devices?.map(d => ({ id: d.id, name: d.name, type: d.type, active: d.is_active })));

        if (devData && devData.devices && devData.devices.length > 0) {
          const targetDev = devData.devices.find(d => d.is_active) || devData.devices[0];
          console.log(`[SPOTIFY RETRY] Retrying play on device "${targetDev.name}" (${targetDev.id})...`);
          const retryEndpoint = `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(targetDev.id)}`;
          spotifyRes = await fetch(retryEndpoint, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${spotifyToken}`,
              'Content-Type': 'application/json'
            },
            body: body
          });
          console.log(`[SPOTIFY RETRY RESULT] Status: ${spotifyRes.status}`);
        }
      } catch (devErr) {
        console.warn('Error al buscar dispositivos alternativos de Spotify:', devErr);
      }
    }

    if (spotifyRes.status === 404) {
       console.warn('[SPOTIFY 404] No active playback device found on user account.');
       return res.status(404).json({ error: 'No se detectó un dispositivo activo en tu cuenta de Spotify. Abre la app de Spotify o activa el reproductor.' });
    }

    if (spotifyRes.status === 403) {
       console.warn('[SPOTIFY 403] Premium required or restricted.');
       return res.status(403).json({ error: 'Se requiere Spotify Premium para reproducir por streaming remoto.' });
    }

    if (!spotifyRes.ok && spotifyRes.status !== 204 && spotifyRes.status !== 200) {
       const errData = await spotifyRes.json().catch(() => ({}));
       console.error('[SPOTIFY API ERROR RESPONSE]:', errData);
       return res.status(400).json({ error: 'Error al enviar comando a Spotify.', details: errData });
    }

    console.log(`✅ [SPOTIFY SUCCESS] Command "${action}" executed cleanly.`);
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
  
  // Ejecutar scripts de creación y migración de tablas
  try {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await db.query(stmt);
        } catch (stmtErr) {
          console.warn('DB Migration warning:', stmtErr.message);
        }
      }
      console.log('Tablas inicializadas y migradas correctamente en la base de datos.');
    }
  } catch (err) {
    console.error('Error al inicializar las tablas de la base de datos:', err);
  }
});
