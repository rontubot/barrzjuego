// Servicio de Detección de Actualizaciones y Sincronización Automática con GitHub / Servidor
import { Capacitor } from '@capacitor/core';
import { getApiUrl } from './spotifyPlayer';

export const CURRENT_CLIENT_VERSION = '3.1.0';
export const CURRENT_BUILD_TIMESTAMP = '2026.10';
export const CURRENT_CLIENT_COMMIT = '1762834'; // Commit base del build empaquetado

function isVersionHigher(remote: string, current: string): boolean {
  const rParts = remote.split('.').map(n => parseInt(n, 10) || 0);
  const cParts = current.split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(rParts.length, cParts.length);

  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export interface AppVersionInfo {
  version: string;
  build: string;
  commit?: string;
  commitMessage?: string;
  commitDate?: string;
  liveWebUrl?: string;
  min_required_apk?: string;
  github_repo?: string;
  download_url?: string;
  isNewer: boolean;
}

type UpdateListener = (info: AppVersionInfo) => void;
const listeners = new Set<UpdateListener>();

export const subscribeToUpdates = (listener: UpdateListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (info: AppVersionInfo) => {
  listeners.forEach(l => l(info));
};

/**
 * Consulta la versión más reciente del servidor y GitHub
 */
export async function checkForUpdates(): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch(getApiUrl(`/api/app/version?_t=${Date.now()}`), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const serverVersion = data.version || '1.0.0';
      const serverBuild = data.build || '';
      const serverCommit = data.commit || '';

      // Comparación real de versiones (SemVer, timestamp o nuevo commit en GitHub)
      const isVersionNewer = isVersionHigher(serverVersion, CURRENT_CLIENT_VERSION);
      const isSameVersion = serverVersion === CURRENT_CLIENT_VERSION;
      const isBuildNewer = Boolean(isSameVersion && serverBuild && serverBuild > CURRENT_BUILD_TIMESTAMP);
      const isCommitNewer = Boolean(serverCommit && serverCommit !== CURRENT_CLIENT_COMMIT);

      const isNewer = isVersionNewer || isBuildNewer || isCommitNewer;

      const info: AppVersionInfo = {
        version: serverVersion,
        build: serverBuild,
        commit: serverCommit,
        commitMessage: data.commitMessage,
        commitDate: data.commitDate,
        liveWebUrl: data.live_web_url || 'https://barrzjuego.com',
        min_required_apk: data.min_required_apk,
        github_repo: data.github_repo,
        download_url: data.download_url,
        isNewer
      };

      if (isNewer) {
        console.log('⚡ [BARRZ UPDATER] Nuevo parche detectado en GitHub/Servidor:', info);
        notifyListeners(info);
      }

      return info;
    }
  } catch (err) {
    console.warn('⚡ [BARRZ UPDATER] No se pudo verificar versión remota:', err);
  }
  return null;
}

/**
 * Aplica el parche remoto cargando la última versión web desde el servidor
 */
export function applyWebUpdate(patchInfo?: AppVersionInfo | null) {
  if (typeof window !== 'undefined') {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    const targetCommit = patchInfo?.commit || Date.now().toString();
    localStorage.setItem('barrz_last_patch_applied', targetCommit);

    // En Capacitor Nativo (APK): Redirige a la versión viva en barrzjuego.com con el parche
    if (Capacitor.isNativePlatform()) {
      const baseUrl = patchInfo?.liveWebUrl || 'https://barrzjuego.com';
      window.location.href = `${baseUrl}?patch=${targetCommit}&t=${Date.now()}`;
    } else {
      window.location.reload();
    }
  }
}

// Iniciar sondeo periódico cada 3 minutos
if (typeof window !== 'undefined') {
  setTimeout(() => {
    checkForUpdates();
  }, 10000); // Primer chequeo a los 10 segundos de abrir la app

  setInterval(() => {
    checkForUpdates();
  }, 180000); // Chequeo periódico cada 3 minutos
}
