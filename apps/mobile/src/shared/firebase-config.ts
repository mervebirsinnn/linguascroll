// 2026-10-27 — Firebase Authentication (Google ile giriş) yapılandırması. Bu değerler GİZLİ
// DEĞİL: Firebase web config'i ve Google OAuth "Web client" id'si istemciye gömülmek için
// tasarlanmış (yetki, backend'in token'ı doğrulamasından geliyor). EXPO_PUBLIC_ değişkenleri
// build zamanında gömülür; API_BASE_URL/revenuecat-config ile aynı desen — bu env'leri okuyan
// TEK yer burası. Eksikse giriş ekranı anlaşılır bir hata gösterir (uygulama çökmez).

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

function read(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

const apiKey = read(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
const authDomain = read(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN);
const projectId = read(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
const appId = read(process.env.EXPO_PUBLIC_FIREBASE_APP_ID);

export const FIREBASE_WEB_CONFIG: FirebaseWebConfig | undefined =
  apiKey && authDomain && projectId && appId ? { apiKey, authDomain, projectId, appId } : undefined;

/** Google Cloud > Credentials > OAuth client "Web application" id'si — Google ID token'ının audience'ı. */
export const GOOGLE_WEB_CLIENT_ID: string | undefined = read(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
