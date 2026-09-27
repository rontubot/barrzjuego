import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.barrz.freestyle',
  appName: 'Barrz Freestyle',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'accounts.spotify.com',
      'open.spotify.com',
      'barrzjuego.com',
      '*.barrzjuego.com',
      '*.spotify.com',
      '*.scdn.co'
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '103522205562-b9r1r76scj8g7btrhfs8a209t7h6j3s1.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;

