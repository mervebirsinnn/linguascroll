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
        // max BİLİNÇLİ OLARAK 500 — TEŞHİS AMAÇLI, kalıcı bir prod ayarı olarak
        // seçilmedi. Sırasıyla: pg'nin varsayılanı (10) 250 VU'da %31.88 hataya
        // yol açtı (2026-09-30 k6 testi) → 30'a çıkarınca 250 VU tamamen sağlıklı
        // oldu AMA 500 VU'da hâlâ %80.95 hata vardı → Neon panelinde gerçek
        // bağlantı limitinin ~901 olduğu doğrulandı (bizim 30'umuzun ÇOK
        // altında). Bu, 500 VU'daki çöküşün artık DB pool'undan mı yoksa
        // Render'ın kendi CPU/memory kapasitesinden mi geldiğini ayırt etmek
        // için pool'u 500 VU'nun kendisiyle eşleşecek kadar büyütüyor — eğer bu
        // seviyede de hata sürüyorsa, kanıt DB pool'unun DEĞİL Render
        // instance'ının tavana çarptığını gösterir. Sonuca göre kalıcı bir
        // değere (muhtemelen çok daha düşük) geri çekilecek.
        const pool = new Pool({ connectionString: configService.getOrThrow<string>("DATABASE_URL"), max: 500 });
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
