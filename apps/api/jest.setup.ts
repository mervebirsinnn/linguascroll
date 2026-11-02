import { config } from "dotenv";
import { getTestDatabaseUrl } from "./src/videos/test-database";

// Testler .env değil, .env.test okur — DATABASE_URL'e fallback yapmayan
// TEST_DATABASE_URL contract'ı burada yükleniyor.
config({ path: ".env.test" });

// AppModule'ün @Module() decorator'ı (ve içindeki ConfigModule.forRoot()), o dosya
// import edildiği anda, modül değerlendirme zamanında çalışıyor — bir test dosyasının
// beforeAll'ı içinde process.env.DATABASE_URL atamak ÇOK GEÇ kalır (import'lar her
// zaman dosya gövdesinden önce çalışır). Bu köprü, herhangi bir test dosyası
// AppModule'ü import etmeden ÖNCE, tüm suite için TEK bir yerde kuruluyor.
// getTestDatabaseUrl() zaten fail-fast + "linguascroll_test" guard'ını içeriyor.
process.env.DATABASE_URL = getTestDatabaseUrl();

// 2026-10-27 — FIREBASE_PROJECT_ID boot'ta zorunlu (app.module.ts envSchema). Testler gerçek bir
// Firebase projesine gitmiyor: e2e spec'ler FirebaseTokenVerifier'ı test verifier'ıyla
// override ediyor (bkz. src/auth/test-auth.ts) — burada sadece boot için bir değer veriliyor.
process.env.FIREBASE_PROJECT_ID ??= "linguascroll-test";

// Genel e2e testleri geliştiricinin .env abonelik kapısından etkilenmemeli.
// Kapı senaryoları subscriptions.e2e-spec.ts içinde açıkça true ile sınanır.
process.env.SUBSCRIPTION_GATE_ENABLED = "false";

// Testler geliştiricinin medya imzalama ayarını da kullanmaz.
process.env.MEDIA_URL_SIGNING_SECRET = "test-only-media-signing-secret-at-least-32-chars";
process.env.PUBLIC_MEDIA_BASE_URL = "http://localhost:3000";
