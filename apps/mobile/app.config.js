// 2026-11-20 — iOS yayını: app.json statik kalır, bu dosya yalnızca ENV'E BAĞLI tek eklentiyi ekler.
//
// Neden: @react-native-google-signin plugin'i (Firebase config dosyası olmadan) `iosUrlScheme` zorunlu tutuyor ve
// verilmezse config'i tamamen kırıyor (Android build'i ve `expo start` dahil). Şema, Google'ın iOS OAuth client
// id'sinin ters çevrilmiş hâli — yani aynı bilgiyi ikinci bir env'de tutmak yerine EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'den
// türetiyoruz (uygulama kodu da aynı değeri GoogleSignin.configure({ iosClientId }) için okuyor; bkz. firebase-config.ts).
// Değer yoksa plugin eklenmez: Android/geliştirme akışı bugünkü gibi çalışır. iOS production build'inde değerin
// varlığını check-release-config.cjs zorunlu tutar (eksikse build başlamadan durur).
// Bu plugin seçenek verildiğinde YALNIZCA iOS Info.plist'e URL şeması ekler; Android'e dokunmaz.
const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';

function googleIosUrlScheme(clientId) {
  if (!clientId.endsWith(GOOGLE_CLIENT_SUFFIX)) {
    throw new Error(`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID "${GOOGLE_CLIENT_SUFFIX}" ile bitmeli (Google Cloud > iOS OAuth client).`);
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -GOOGLE_CLIENT_SUFFIX.length)}`;
}

module.exports = ({ config }) => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!clientId) return config;
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme(clientId) }]],
  };
};

module.exports.googleIosUrlScheme = googleIosUrlScheme;
