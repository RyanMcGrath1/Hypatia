/**
 * Resolves localhost/LAN/emulator hosts for local HTTP backends when using Expo dev clients.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * LAN IP of the machine running Metro (e.g. 192.168.1.71), when using Expo Go / dev.
 * Physical devices must call this host — 127.0.0.1 on the phone is the phone itself.
 */
function getExpoDevHostIp(): string | null {
  if (!__DEV__) {
    return null;
  }

  const manifest = Constants.manifest;
  if (manifest && typeof manifest === 'object' && 'debuggerHost' in manifest) {
    const dh = (manifest as { debuggerHost?: string }).debuggerHost;
    if (typeof dh === 'string' && dh.length > 0) {
      const host = dh.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  }

  const m2 = Constants.manifest2 as
    | {
        extra?: {
          expoGo?: { debuggerHost?: string };
          expoClient?: { hostUri?: string };
        };
      }
    | null
    | undefined;

  const goDh = m2?.extra?.expoGo?.debuggerHost;
  if (typeof goDh === 'string' && goDh.length > 0) {
    const host = goDh.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  const hostUri = m2?.extra?.expoClient?.hostUri;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  return null;
}

function isProbablyAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }
  const c = Platform.constants as {
    Brand?: string;
    Model?: string;
    Manufacturer?: string;
  };
  const model = (c.Model ?? '').toLowerCase();
  const brand = (c.Brand ?? '').toLowerCase();
  return (
    model.includes('google_sdk') ||
    model.includes('emulator') ||
    model.includes('sdk_gphone') ||
    model.includes('sdk') ||
    brand === 'generic'
  );
}

/** Dev/simulator/real-device base URL for a local HTTP API on `port`, mirroring Metro LAN discovery. */
export function getDevApiBaseUrlForPort(port: number): string {
  if (Platform.OS === 'web') {
    return `http://127.0.0.1:${port}`;
  }

  if (Platform.OS === 'android' && isProbablyAndroidEmulator()) {
    return `http://10.0.2.2:${port}`;
  }

  const devHost = getExpoDevHostIp();
  if (devHost) {
    return `http://${devHost}:${port}`;
  }

  return Platform.OS === 'android' ? `http://10.0.2.2:${port}` : `http://127.0.0.1:${port}`;
}
