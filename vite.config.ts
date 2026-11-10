import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

let gitCommitSha = '1762834'
try {
  gitCommitSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // Fallback si git no está disponible en el entorno de build
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Genera rutas relativas para compatibilidad con subdirectorios y GitHub Pages
  define: {
    'import.meta.env.VITE_GIT_COMMIT_SHA': JSON.stringify(gitCommitSha),
  },
})
