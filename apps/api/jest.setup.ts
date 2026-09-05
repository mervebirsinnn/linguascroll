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
