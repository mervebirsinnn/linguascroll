// Değerler/anahtarlar loglanmaz; yalnızca hatalı alan adları raporlanır.
const { isIP } = require('node:net');
const common = ['EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_FIREBASE_API_KEY','EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN','EXPO_PUBLIC_FIREBASE_PROJECT_ID','EXPO_PUBLIC_FIREBASE_APP_ID','EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EXPO_PUBLIC_SUPPORT_EMAIL'];
// 2026-11-20 — iOS yayını: mağaza anahtarı platforma özel. Android build'i iOS anahtarı istemez (ve tersi); iOS'ta
// ayrıca Google'ın iOS OAuth client id'si zorunlu — yoksa app.config.js URL şemasını ekleyemez ve iOS'ta Google
// girişi açılamaz. EAS, build platformunu EAS_BUILD_PLATFORM ile verir; elle çalıştırmada --platform=ios.
const platformRequired = {
  android: ['EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'],
  ios: ['EXPO_PUBLIC_REVENUECAT_IOS_API_KEY','EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'],
};
function publicHttps(value) {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || url.username || url.password || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.')) return false;
    // Release adresi fiziksel cihazdan erişilmeli; özel/loopback IP'ler kabul edilmez.
    if (isIP(host) === 6) return false;
    if (isIP(host) === 4) {
      const [a,b] = host.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false;
    }
    return true;
  } catch { return false; }
}
function validateReleaseEnv(env, platform = 'android') {
  if (!platformRequired[platform]) return [`Bilinmeyen platform: ${platform}`];
  const required = [...common, ...platformRequired[platform]];
  const errors = required.filter(name => !env[name]?.trim()).map(name => `${name} eksik`);
  for (const name of ['EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL']) {
    if (env[name]?.trim() && !publicHttps(env[name])) errors.push(`${name} erişilebilir HTTPS adresi olmalı`);
  }
  if (env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL)) errors.push('EXPO_PUBLIC_SUPPORT_EMAIL geçerli e-posta olmalı');
  if (platform === 'android' && env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() && !/^goog_\S+$/.test(env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY)) errors.push('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY Google Play public SDK anahtarı olmalı');
  if (platform === 'ios' && env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() && !/^appl_\S+$/.test(env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)) errors.push('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY App Store public SDK anahtarı olmalı');
  if (platform === 'ios' && env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() && !/^\S+\.apps\.googleusercontent\.com$/.test(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.trim())) errors.push('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID Google iOS OAuth client id olmalı');
  return errors;
}
module.exports = { validateReleaseEnv };
if (require.main === module) {
  // EAS hook geliştirme build'ini engellemez; mağaza profili zorunlu kontrolden geçer.
  if (process.argv.includes('--eas') && process.env.EAS_BUILD_PROFILE !== 'production') console.log('Release kontrolü yalnızca production build profiline uygulanır.');
  else {
    const arg = process.argv.find(a => a.startsWith('--platform='));
    const platform = arg ? arg.slice('--platform='.length) : (process.env.EAS_BUILD_PLATFORM || 'android');
    const errors = validateReleaseEnv(process.env, platform);
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log('Release yapılandırma alanları tamam. Mağaza ve cihaz doğrulaması ayrıca gereklidir.');
  }
}
