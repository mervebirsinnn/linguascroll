import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const PG_POOL = Symbol("PG_POOL");
export const DRIZZLE_DB = Symbol("DRIZZLE_DB");
export type Database = NodePgDatabase;

/**
 * DB bağlantısı TEK bu modülde kuruluyor: bir pg.Pool singleton olarak açılıyor,
 * Drizzle bunun üzerine ince bir katman olarak bağlanıyor. Request-scoped değil —
 * Nest'in varsayılan provider scope'u (singleton) korunuyor.
 *
 * @Global: DATABASE_URL bağlantısı uygulamanın tamamının paylaştığı tek bir kaynak;
 * her feature modülünün ayrı ayrı import etmesini istemiyoruz.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        // max BİLİNÇLİ OLARAK 40 — kalıcı değer, teşhis süreci bitti (2026-09-30
        // k6 testleri): pg varsayılanı (10) 250 VU'da %31.88 hataya yol açıyordu;
        // 30'a çıkarınca 250 VU tamamen sağlıklı oldu (p95=1.03s, %0 hata). 500
        // VU'da pool'u DENEYSEL OLARAK 500'e kadar çıkarmak (Neon'un ~901'lik
        // gerçek limitinin çok altında) SONUCU DEĞİŞTİRMEDİ (hâlâ ~%84 hata) —
        // bu, 500 VU'daki çöküşün DB pool'undan DEĞİL, Render instance'ının
        // kendi CPU/memory kapasitesinden geldiğini KANITLADI. Yani pool'u daha
        // fazla büyütmenin faydası yok; 40, 250 VU'ya kadar kanıtlanmış rahat
        // payı olan, gereksiz kaynak tüketmeyen kalıcı değer. 500 VU'yu gerçekten
        // desteklemek istenirse çözüm burada değil, Render hosting tier'ında.
        const pool = new Pool({ connectionString: configService.getOrThrow<string>("DATABASE_URL"), max: 40 });
        // node-postgres'in bilinen davranışı: havuzdaki boşta bir bağlantı hata
        // alırsa (ağ kopması, DB'nin bağlantıyı kapatması) bunu bir 'error' event'i
        // olarak yayınlar. Dinleyicisi olmayan bir 'error' event'i Node'da yakalanmamış
        // exception sayılır ve TÜM process'i çökertir — sadece o isteği değil.
        pool.on("error", (err) => {
          console.error("Beklenmeyen idle Postgres bağlantı hatası:", err);
        });
        return pool;
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool),
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Graceful shutdown: Nest'in shutdown hook'ları (main.ts'te enableShutdownHooks())
  // tetiklendiğinde havuzu kapatır. Bu olmadan dev'de sık restart, bağlantı
  // sızıntısına yol açabilir.
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
