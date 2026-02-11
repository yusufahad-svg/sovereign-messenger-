import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sovereign.messenger',
  appName: 'SovereignMessenger',
  webDir: 'tip-jar-pwa/dist', // Updated path
  server: {
    url: 'https://web-production-f59a4.up.railway.app/',
    cleartext: true
  }
};

export default config;
