// Spotify Web Playback SDK & API Service for BARRZ
import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: any;
  }
}

export const getApiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
  return `${base}${path}`;
};

export interface SpotifyPlayerState {
  isReady: boolean;
  deviceId: string | null;
  isPlaying: boolean;
  currentTrack: string | null;
  error: string | null;
  isPremium: boolean;
}

type StateListener = (state: SpotifyPlayerState) => void;

/**
 * Conectar cuenta de Spotify mediante OAuth 2.0
 * En móvil (Android/iOS) utiliza Chrome Custom Tabs / In-App Browser y deep link custom scheme.
 * En Web realiza la redirección estándar.
 */
export async function connectSpotify(returnStep?: string) {
  const token = localStorage.getItem('barrz_token');
  if (!token) {
    alert('Debes iniciar sesión con tu cuenta para asociar Spotify.');
    return;
  }
  if (returnStep) {
    localStorage.setItem('barrz_spotify_return_step', returnStep);
  }
  const isMobile = Capacitor.isNativePlatform();
  const stateVal = isMobile ? `${token}:app` : token;
  const authUrl = getApiUrl(`/api/spotify/login?state=${encodeURIComponent(stateVal)}`);

  // Realizar la navegación SIEMPRE dentro de la propia WebView de la app.
  // De este modo, la sesión y cookies de spotify.com quedan en el CookieManager del WebView,
  // permitiendo que el reproductor oficial Embed (iframe) reconozca la cuenta y genere regalías oficiales.
  window.location.href = authUrl;
}

/**
 * Desvincular Spotify de la cuenta de Barrz tanto en el servidor como localmente
 */
export async function disconnectSpotify(): Promise<boolean> {
  const token = localStorage.getItem('barrz_token');
  if (token) {
    try {
      await fetch(getApiUrl('/api/spotify/unlink'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error al desvincular Spotify en servidor:', err);
    }
  }
  localStorage.removeItem('barrz_spotify_linked');
  spotifyPlayer.disconnect();
  window.dispatchEvent(new CustomEvent('barrz_spotify_status_changed', { detail: { linked: false, spotify_user: null } }));
  return true;
}

/**
 * Comprobar el estado real de vinculación de Spotify con el servidor.
 * Protegido contra fallos transitorios de red para no perder la sesión localmente.
 */
export async function checkSpotifyStatus(): Promise<{ linked: boolean; spotify_user?: any }> {
  const token = localStorage.getItem('barrz_token');
  if (!token) {
    return { linked: false };
  }
  try {
    const res = await fetch(getApiUrl('/api/spotify/status'), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.linked) {
        localStorage.setItem('barrz_spotify_linked', 'true');
        spotifyPlayer.init();
        return { linked: true, spotify_user: data.spotify_user };
      } else if (data && data.linked === false) {
        localStorage.removeItem('barrz_spotify_linked');
        spotifyPlayer.disconnect();
        return { linked: false };
      }
    }
  } catch (err) {
    console.warn('Error al verificar estado de Spotify en servidor:', err);
  }
  // En caso de corte de red, conservamos el estado existente para no desconectar al usuario
  return { linked: localStorage.getItem('barrz_spotify_linked') === 'true' };
}

class SpotifyPlayerService {
  private player: any = null;
  private deviceId: string | null = null;
  private isReady: boolean = false;
  private isPlaying: boolean = false;
  private currentTrack: string | null = null;
  private isPremium: boolean = true;
  private error: string | null = null;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'barrz_spotify_linked') {
          if (e.newValue === 'true') {
            this.init();
          } else {
            this.disconnect();
          }
        }
      });
    }
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  public getState(): SpotifyPlayerState {
    return {
      isReady: this.isReady,
      deviceId: this.deviceId,
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      error: this.error,
      isPremium: this.isPremium
    };
  }

  public async fetchAccessToken(): Promise<string | null> {
    const appToken = localStorage.getItem('barrz_token');
    if (!appToken) return null;

    try {
      const res = await fetch(getApiUrl('/api/spotify/token'), {
        headers: {
          'Authorization': `Bearer ${appToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        return data.access_token;
      }
    } catch (e: any) {
      console.warn('Error al obtener token de acceso de Spotify:', e.message);
    }
    return null;
  }

  public async init() {
    if (typeof window === 'undefined') return;
    const isLinked = localStorage.getItem('barrz_spotify_linked') === 'true';
    if (!isLinked) {
      this.isReady = false;
      this.notify();
      return;
    }

    // En plataforma móvil (Capacitor Android / iOS), las WebViews no soportan Widevine DRM
    // requerido por el Spotify Web Playback SDK (https://sdk.scdn.co/spotify-player.js).
    // Por ende, marcamos el servicio como listo para control Web API / Embed sin cargar el SDK incompatible.
    if (Capacitor.isNativePlatform()) {
      this.isReady = true;
      this.error = null;
      this.notify();
      return;
    }

    // En navegadores web de escritorio, cargar e inicializar el Spotify Web Playback SDK
    if (this.player) return;

    if (!document.getElementById('spotify-player-sdk')) {
      const script = document.createElement('script');
      script.id = 'spotify-player-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      this.createPlayer();
    };

    if (window.Spotify && !this.player) {
      this.createPlayer();
    }
  }

  private async createPlayer() {
    if (!window.Spotify) return;

    const token = await this.fetchAccessToken();
    if (!token) return;

    try {
      this.player = new window.Spotify.Player({
        name: 'BARRZ Cypher Player',
        getOAuthToken: async (cb: (token: string) => void) => {
          const freshToken = await this.fetchAccessToken();
          if (freshToken) cb(freshToken);
        },
        volume: 0.85
      });

      // Ready
      this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Web Playback SDK Listo con Device ID:', device_id);
        this.deviceId = device_id;
        this.isReady = true;
        this.error = null;
        this.notify();
      });

      // Not Ready
      this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.warn('Device ID de Spotify inactivo:', device_id);
        this.isReady = false;
        this.notify();
      });

      // State change
      this.player.addListener('player_state_changed', (state: any) => {
        if (!state) {
          this.isPlaying = false;
          this.currentTrack = null;
        } else {
          this.isPlaying = !state.paused;
          this.currentTrack = state.track_window?.current_track?.name || null;
        }
        this.notify();
      });

      // Errors
      this.player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.warn('Spotify Init Warning:', message);
        // Si falla en navegador no compatible, mantener listo para control remoto Web API
        this.isReady = true;
        this.notify();
      });

      this.player.addListener('authentication_error', async ({ message }: { message: string }) => {
        console.warn('Spotify Auth Warning:', message);
        const freshToken = await this.fetchAccessToken();
        if (!freshToken) {
          this.error = 'Sesión de Spotify expirada. Reconectá tu cuenta.';
          this.notify();
        }
      });

      this.player.addListener('account_error', ({ message }: { message: string }) => {
        console.warn('Spotify Account Warning (Requiere Premium para SDK directo):', message);
        this.isPremium = false;
        this.notify();
      });

      this.player.addListener('playback_error', ({ message }: { message: string }) => {
        console.warn('Spotify Playback Notice:', message);
      });

      await this.player.connect();
    } catch (e: any) {
      console.warn('No se pudo inicializar Spotify Web Player:', e.message);
      this.isReady = true;
      this.notify();
    }
  }

  public async playTrack(spotifyUri: string): Promise<boolean> {
    const appToken = localStorage.getItem('barrz_token');
    if (!appToken) {
      return false;
    }

    try {
      console.log('🎵 [SpotifyPlayer] Enviando comando Play a Spotify:', spotifyUri);
      const res = await fetch(getApiUrl('/api/spotify/control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appToken}`
        },
        body: JSON.stringify({
          action: 'play',
          uri: spotifyUri,
          device_id: this.deviceId || undefined
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        this.isPlaying = true;
        this.error = null;
        this.notify();
        return true;
      } else {
        // Si el error es 404 (sin dispositivo remoto activo), no consideramos expirada la sesión
        if (res.status === 404) {
          console.info('ℹ️ [SpotifyPlayer] No se detectó dispositivo Spotify activo. La instrumental local continuará sonando.');
        } else {
          console.warn('⚠️ [SpotifyPlayer] Respuesta de control:', data.error);
        }
        this.isPlaying = true;
        this.notify();
        return true;
      }
    } catch (e: any) {
      console.warn('🎵 [SpotifyPlayer] Aviso de red en control Spotify:', e.message);
      this.isPlaying = true;
      this.notify();
      return true;
    }
  }

  public async pauseTrack(): Promise<boolean> {
    const appToken = localStorage.getItem('barrz_token');
    if (!appToken) return false;

    try {
      const res = await fetch(getApiUrl('/api/spotify/control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appToken}`
        },
        body: JSON.stringify({
          action: 'pause',
          device_id: this.deviceId || undefined
        })
      });

      if (res.ok) {
        this.isPlaying = false;
        this.notify();
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn('🎵 [SpotifyPlayer] Aviso al pausar Spotify:', e.message);
      return false;
    }
  }

  public isPlayerReady(): boolean {
    return this.isReady;
  }

  public async pause(): Promise<boolean> {
    return this.pauseTrack();
  }

  public disconnect() {
    if (this.player) {
      try {
        this.player.disconnect();
      } catch {}
      this.player = null;
    }
    this.isReady = false;
    this.deviceId = null;
    this.isPlaying = false;
    this.notify();
  }
}

export const spotifyPlayer = new SpotifyPlayerService();
