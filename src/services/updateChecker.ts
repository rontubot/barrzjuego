// Servicio de Detección de Actualizaciones y Sincronización Automática con GitHub / Servidor
import { Capacitor } from '@capacitor/core';
import { getApiUrl } from './spotifyPlayer';

export const CURRENT_CLIENT_VERSION = '3.1.0';
export const CURRENT_BUILD_TIMESTAMP = '2026.11';
export const CURRENT_CLIENT_COMMIT: string = import.meta.env.VITE_GIT_COMMIT_SHA || '1762834'; // Commit inyectado automáticamente en build

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

/**
 * Consulta la versión más reciente del servidor y GitHub (con timeout rápido de 3s)
 */
export async function checkForUpdates(): Promise<AppVersionInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(getApiUrl(`/api/app/version?_t=${Date.now()}`), {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const serverVersion = data.version || '1.0.0';
      const serverBuild = data.build || '';
      const serverCommit = data.commit || '';

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

      return info;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('⚡ [BARRZ UPDATER] No se pudo verificar versión remota:', err);
  }
  return null;
}

/**
 * Proceso silencioso y automático ejecutado durante la pantalla de carga (loader inicial).
 * Realiza las verificaciones e invalida cachés o parchea la APK/AAB sin requerir interacción del usuario.
 */
export async function checkAndApplyStartupUpdate(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return false;
  }

  try {
    const info = await checkForUpdates();
    if (!info) {
      return false;
    }

    const serverCommit = info.commit || '';
    const isLocalOrigin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 1. Caso Web o WebView ya cargado en el dominio remoto (barrzjuego.com):
    // Invalidamos cachés obsoletas si hubo un nuevo commit, sin provocar redirecciones en bucle.
    if (!Capacitor.isNativePlatform() || !isLocalOrigin) {
      const lastWebCommit = localStorage.getItem('barrz_web_commit');
      if (serverCommit && lastWebCommit !== serverCommit) {
        localStorage.setItem('barrz_web_commit', serverCommit);
        if ('caches' in window) {
          const names = await caches.keys().catch(() => []);
          await Promise.all(names.map(name => caches.delete(name))).catch(() => {});
        }
      }
      return false;
    }

    // 2. Caso App Nativa (Capacitor Android arrancando desde el bundle local empaquetado):
    // Si el servidor/GitHub tiene un commit más nuevo que el empaquetado en la APK/AAB,
    // sincroniza y carga automáticamente la versión viva del servidor durante la pantalla de carga.
    if (info.isNewer && serverCommit) {
      const lastApplied = localStorage.getItem('barrz_last_patch_applied');
      if (lastApplied !== serverCommit) {
        localStorage.setItem('barrz_last_patch_applied', serverCommit);
        if ('caches' in window) {
          const names = await caches.keys().catch(() => []);
          await Promise.all(names.map(name => caches.delete(name))).catch(() => {});
        }
      }
      const baseUrl = info.liveWebUrl || 'https://barrzjuego.com';
      window.location.href = `${baseUrl}?patch=${serverCommit}`;
      return true; // Redirección inmediata en curso durante el loader
    }
  } catch (err) {
    console.warn('[BARRZ Loader] Verificación silenciosa en arranque omitida:', err);
  }

  return false;
}
