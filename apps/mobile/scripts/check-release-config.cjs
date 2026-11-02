// Değerler/anahtarlar loglanmaz; yalnızca hatalı alan adları raporlanır.
const { isIP } = require('node:net');
const required = ['EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_FIREBASE_API_KEY','EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN','EXPO_PUBLIC_FIREBASE_PROJECT_ID','EXPO_PUBLIC_FIREBASE_APP_ID','EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID','EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EXPO_PUBLIC_SUPPORT_EMAIL'];
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
function validateReleaseEnv(env) {
  const errors = required.filter(name => !env[name]?.trim()).map(name => `${name} eksik`);
  for (const name of ['EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL']) {
    if (env[name]?.trim() && !publicHttps(env[name])) errors.push(`${name} erişilebilir HTTPS adresi olmalı`);
  }
  if (env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL)) errors.push('EXPO_PUBLIC_SUPPORT_EMAIL geçerli e-posta olmalı');
  if (env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() && !/^goog_\S+$/.test(env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY)) errors.push('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY Google Play public SDK anahtarı olmalı');
  return errors;
}
module.exports = { validateReleaseEnv };
if (require.main === module) {
  // EAS hook geliştirme build'ini engellemez; mağaza profili zorunlu kontrolden geçer.
  if (process.argv.includes('--eas') && process.env.EAS_BUILD_PROFILE !== 'production') console.log('Release kontrolü yalnızca production build profiline uygulanır.');
  else {
    const errors = validateReleaseEnv(process.env);
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log('Release yapılandırma alanları tamam. Mağaza ve cihaz doğrulaması ayrıca gereklidir.');
  }
}
