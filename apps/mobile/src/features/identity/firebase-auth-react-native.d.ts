import type { Persistence, ReactNativeAsyncStorage } from "@firebase/auth";

/**
 * 2026-10-27 — `@firebase/auth`'un React Native build'i (dist/rn, Metro `react-native` export
 * koşuluyla seçiyor) `getReactNativePersistence`'ı GERÇEKTEN export ediyor (doğrulandı:
 * dist/rn/index.js). Ama paketin export haritasında `types` koşulu `react-native`'den önce
 * geldiği için TypeScript web tiplerini seçiyor ve bu fonksiyonu görmüyor. Bu dosya cast/
 * ts-ignore DEĞİL: paketin kendi RN tip dosyasındaki (dist/rn/.../react_native.d.ts) imzanın
 * birebir aynısını modüle ekliyor. Firebase sürümü yükseltilince imza yeniden kontrol edilmeli.
 */
declare module "@firebase/auth" {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
