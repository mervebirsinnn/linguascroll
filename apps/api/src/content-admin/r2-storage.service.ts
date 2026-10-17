import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { buildOriginalVideoStorageKey } from "./build-storage-key";

/**
 * Chunk 17 — kullanıcı kararı: R2 kimlik bilgileri `app.module.ts`'teki global
 * `envSchema`'ya EKLENMEDİ. O şema "uygulama hiç boot olamaz" seviyesindeki
 * zorunlu config için (DATABASE_URL, FEED_CURSOR_SECRET) — R2 henüz sadece TEK
 * bir endpoint'in (`POST /content-admin/videos/upload`) bağımlılığı, feed/videos/
 * words/quizzes gibi mevcut hiçbir özellik buna ihtiyaç duymuyor. R2 yapılandırılmamış
 * bir ortamda API'nin TAMAMEN boot olamaması (feed dahil) gereksiz/yanlış bir
 * bağlama olurdu. Bunun yerine burada LAZY/ihtiyaç-anında doğrulama var: eksik bir
 * env var'ı sadece bu servis gerçekten çağrıldığında (`getClient()`/`buildPlaybackUrl`
 * içinde) net bir hatayla patlar — Gemini client'ının (`enrichment-llm-client.ts`)
 * "sadece kullanıldığında env kontrolü" desenine benzer, ama process.env yerine
 * (bu bir CLI script değil, Nest app'in içinde çalıştığı için) ConfigService
 * kullanılıyor — projedeki idiomatic okuma yolu.
 */
export class R2ConfigError extends Error {}

/** Chunk 17B — `GetObjectCommand`'ın modellediği `NoSuchKey` durumu için, çağıranın 404'e çevirebileceği net bir tip. */
export class R2ObjectNotFoundError extends Error {}

/** `listOriginalVideoObjects`'in döndürdüğü, orphan raporu için yeterli minimal nesne özeti. */
export interface R2ObjectSummary {
  readonly key: string;
  readonly lastModified: Date | null;
  readonly size: number | null;
}

@Injectable()
export class R2StorageService {
  /**
   * `client` opsiyonel constructor argümanı — Nest DI için `@Optional()` (prod'da
   * hiçbir provider S3Client sağlamıyor, bu yüzden Nest hata vermeden `undefined`
   * geçer ve `getClient()` ilk çağrıda gerçek client'ı lazy kurar), testte ise
   * doğrudan `new R2StorageService(fakeConfigService, mockS3Client)` ile bypass
   * edilip mock enjekte edilir (bkz. r2-storage.service.spec.ts) — ayrı bir DI
   * token/factory provider'a gerek yok (kullanıcı kararı: küçük tutulacak).
   */
  private client: S3Client | undefined;

  constructor(
    private readonly configService: ConfigService,
    @Optional() client?: S3Client,
  ) {
    this.client = client;
  }

  /**
   * `contentId`'nin kendisi burada DOĞRULANMIYOR — çağıran taraf
   * (`ContentAdminService`, `uploadVideoRequestSchema` üzerinden) zaten
   * doğrulamış olarak geliyor; bu servis sadece storage/S3 sorumluluğunu taşıyor.
   */
  async uploadOriginalVideo(params: { contentId: string; buffer: Buffer; contentType: string }): Promise<{ storageKey: string }> {
    const bucket = this.requireEnv("R2_BUCKET_NAME");
    const storageKey = buildOriginalVideoStorageKey(params.contentId, randomUUID());

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );

    return { storageKey };
  }

  /**
   * READ-ONLY: prefix altındaki tüm nesneleri (ListObjectsV2, sayfalı) listeler. Yalnızca orphan raporu içindir
   * (bkz. report-r2-orphans.ts); hiçbir yazma/silme yapmaz.
   */
  async listOriginalVideoObjects(prefix: string = "originals/"): Promise<R2ObjectSummary[]> {
    const bucket = this.requireEnv("R2_BUCKET_NAME");
    const objects: R2ObjectSummary[] = [];
    let continuationToken: string | undefined;
    do {
      const response: { Contents?: { Key?: string; LastModified?: Date; Size?: number }[]; IsTruncated?: boolean; NextContinuationToken?: string } = await this.getClient().send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }),
      );
      for (const item of response.Contents ?? []) {
        if (item.Key) {
          objects.push({ key: item.Key, lastModified: item.LastModified ?? null, size: item.Size ?? null });
        }
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
    return objects;
  }

  /**
   * Yayın telafisi (compensation): R2'ye yüklendikten SONRA DB transaction'ı başarısız olursa yüklenen
   * nesneyi geri silmek için (bkz. publish-content.ts `publishApprovedContent`). S3 DeleteObject
   * olmayan anahtar için de hata vermez (idempotent). Dağıtık transaction/outbox DEĞİL: en-iyi-çaba
   * temizliği; başarısız olursa çağıran yetim nesneyi raporlar.
   */
  async deleteOriginalVideo(storageKey: string): Promise<void> {
    const bucket = this.requireEnv("R2_BUCKET_NAME");
    await this.getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
  }

  /**
   * Chunk 17B — `storageKey`'in bu contentId'ye AİT olup olmadığı burada
   * DOĞRULANMIYOR (çağıran taraf, `SttProcessingService`, `isOwnedOriginalVideoStorageKey`
   * ile zaten doğrulamış olarak geliyor — upload'takiyle AYNI sorumluluk ayrımı:
   * bu servis sadece storage/S3 mekaniği). `GetObjectCommand`'ın modellediği
   * `NoSuchKey` durumu, çağıranın net bir 404'e çevirebilmesi için
   * `R2ObjectNotFoundError`'a çevriliyor — S3 SDK'nın kendi hata şekli/detayları
   * (stack, request id vb.) hiçbir zaman doğrudan çağırana sızmıyor.
   */
  async downloadOriginalVideo(storageKey: string, destinationPath: string): Promise<void> {
    const bucket = this.requireEnv("R2_BUCKET_NAME");

    let response;
    try {
      response = await this.getClient().send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
    } catch (error) {
      if (error instanceof Error && error.name === "NoSuchKey") {
        throw new R2ObjectNotFoundError(`R2'de bulunamadı: "${storageKey}"`);
      }
      throw error;
    }

    const body = response.Body;
    if (!body) {
      throw new R2ObjectNotFoundError(`R2'de bulunamadı (boş gövde): "${storageKey}"`);
    }
    await pipeline(body as Readable, createWriteStream(destinationPath));
  }

  /**
   * Trailing slash'e bağlı sürpriz davranış (kullanıcı kararı, açıkça uyarıldı):
   * WHATWG `URL(relative, base)` çözümlemesi, base "/" ile bitmiyorsa base'in son
   * path segmentini bir "dosya adı" gibi görüp ATAR (örn. base
   * "https://x.com/media" + relative "a.mp4" → "https://x.com/a.mp4", "media"
   * kaybolur) — base "/" ile bitiyorsa ise segment olarak eklenir. Bu yüzden
   * base'i burada HER ZAMAN tek bir trailing slash'e normalize ediyoruz, env
   * var'ın kullanıcı tarafından "/" ile bitirilip bitirilmediğinden bağımsız
   * olarak deterministik sonuç için.
   */
  buildPlaybackUrl(storageKey: string): string {
    const base = this.requireEnv("R2_PUBLIC_BASE_URL");
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return new URL(storageKey, normalizedBase).toString();
  }

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${this.requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.requireEnv("R2_ACCESS_KEY_ID"),
          secretAccessKey: this.requireEnv("R2_SECRET_ACCESS_KEY"),
        },
      });
    }
    return this.client;
  }

  private requireEnv(key: "R2_ACCOUNT_ID" | "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY" | "R2_BUCKET_NAME" | "R2_PUBLIC_BASE_URL"): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new R2ConfigError(`"${key}" tanımlı değil — R2 upload'ı kullanmak için apps/api/.env dosyasına eklenmeli.`);
    }
    return value;
  }
}
