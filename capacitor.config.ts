import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.gritzone.fitness',
  appName: 'GRITZONE',
  // Point to live deployment — web updates ship instantly without store review
  server: {
    url: 'https://gritzone.me',
    cleartext: false,
    androidScheme: 'https',
    hostname: 'gritzone.me',
    allowNavigation: [
      'gritzone.me',
      '*.gritzone.me',
      '*.supabase.co',
      '*.supabase.in',
      'checkout.razorpay.com',
      '*.razorpay.com',
      'secure.payu.in',
      '*.payu.in',
      'accounts.google.com',
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a0a0a',
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Default',
      showSpinner: true,
      spinnerColor: '#f59e0b',
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
};

export default config;
