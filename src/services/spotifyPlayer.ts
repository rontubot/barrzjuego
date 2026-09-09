// Spotify Web Playback SDK & API Service for BARRZ

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: any;
  }
}

const getApiUrl = (path: string) => {
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
      console.warn('Error fetching Spotify access token:', e.message);
    }
    return null;
  }

  public async init() {
    if (typeof window === 'undefined') return;
    const isLinked = localStorage.getItem('barrz_spotify_linked') === 'true';
    if (!isLinked) return;

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
      console.warn('Device ID ha quedado inactivo:', device_id);
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
      console.error('Spotify Init Error:', message);
      this.error = message;
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
      console.warn('Spotify Account Error (Requiere Premium):', message);
      this.isPremium = false;
      this.error = 'Se requiere Spotify Premium para streaming en vivo.';
      this.notify();
    });

    this.player.addListener('playback_error', ({ message }: { message: string }) => {
      console.error('Spotify Playback Error:', message);
    });

    await this.player.connect();
  }

  public async playTrack(spotifyUri: string): Promise<boolean> {
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
          action: 'play',
          uri: spotifyUri,
          device_id: this.deviceId || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        this.isPlaying = true;
        this.notify();
        return true;
      } else {
        if (data.error) {
          this.error = data.error;
          this.notify();
        }
        return false;
      }
    } catch (e: any) {
      console.error('Error enviando comando play a Spotify:', e.message);
      return false;
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
      console.error('Error enviando comando pause a Spotify:', e.message);
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
      this.player.disconnect();
      this.player = null;
    }
    this.isReady = false;
    this.deviceId = null;
    this.isPlaying = false;
    this.notify();
  }
}

export const spotifyPlayer = new SpotifyPlayerService();
