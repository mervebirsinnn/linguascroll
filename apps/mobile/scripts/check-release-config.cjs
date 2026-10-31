// EAS env:exec içinde çalıştırılır. Değerler veya anahtarlar yazdırılmaz, yalnızca alan adları.
const required = ['EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_FIREBASE_API_KEY','EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN','EXPO_PUBLIC_FIREBASE_PROJECT_ID','EXPO_PUBLIC_FIREBASE_APP_ID','EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID','EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EXPO_PUBLIC_SUPPORT_EMAIL'];
const errors = required.filter((name) => !process.env[name]).map((name) => `${name} eksik`);
for (const name of ['EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL']) {
  if (!process.env[name]) continue;
  try { const url = new URL(process.env[name]); if (url.protocol !== 'https:' || url.hostname === 'localhost' || /^127\.|^192\.168\.|^10\./.test(url.hostname)) errors.push(`${name} erişilebilir HTTPS adresi olmalı`); }
  catch { errors.push(`${name} URL biçimi geçersiz`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log('Release yapılandırma alanları tamam. Bu kontrol mağaza ve cihaz doğrulamasının yerine geçmez.');
