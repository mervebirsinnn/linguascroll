import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "../database/database.module";
import { videosTable } from "../videos/videos.schema";
import type { EnrichmentVocabularyItem } from "./enrichment-output.schema";
import type { PublishDraft } from "./publish-draft.schema";
import {
  assertPassesQualityGate,
  loadPublishDraft,
  parseArgs,
  publishVocabularyForVideo,
  PublishPipelineError,
  PublishQualityNeedsReviewError,
  PublishQualityRejectedError,
  type PublishTransaction,
} from "./publish-content";

/**
 * Chunk 14B — Mevcut 15 gerçek video (`seed-videos.ts` ile, `publish-content.ts`
 * pipeline'ından hiç GEÇMEDEN yayınlandı; bkz. CONTENT-SOURCING-PLAN.md) için
 * vocabulary backfill. `enrich-transcript.ts`/`enrichment-llm-client.ts`/`publish-content.ts`'in
 * ANA publish akışı DEĞİŞMEDİ — bu, dar, SADECE `words`/`video_words`'e yazan
 * AYRI bir CLI.
 *
 * Neden `publish-content.ts` yeniden kullanılamıyor (aynen): `assertNotAlreadyPublished`
 * zaten yayınlanmış bir `muxAssetId`'yi koşulsuz reddediyor VE `publishContent`
 * her zaman YENİ bir `videos` satırı insert ediyor — mevcut bir videoya "sadece
 * vocabulary ekle" onun kapsamı dışında (kasıtlı: `publishContent`'i "insert
 * veya upsert" gibi iki modlu hale getirmek, tek-sorumluluk sınırını bozardı).
 *
 * Neden `draft.muxAssetId` kullanılmıyor (mapping dosyası GEREKLİ): bu 15 video
 * için `enrich-transcript.ts`'i TEKRAR çalıştırmak, LLM'e transcript'i yeniden
 * okutup YENİ bir `contentSlug` (dolayısıyla yeni bir `local-<slug>` muxAssetId)
 * ürettirir — bu, DB'deki GERÇEK muxAssetId ile eşleşeceğinin hiçbir garantisi
 * olmayan bir değer. `existing-content-mux-asset-map.json`, STT `contentId`'sini
 * (draft.json'un bulunduğu klasör adı) DB'de zaten var olan gerçek `muxAssetId`'ye
 * bağlayan, elle doğrulanmış, insan-okunabilir tek kaynak (bkz. o dosyanın
 * `_readme`'si — durationMs eşleşmesiyle doğrulandı).
 */

export class VocabularyPublishMappingError extends Error {}
export class VocabularyPublishTargetNotFoundError extends Error {}

const API_ROOT = path.resolve(__dirname, "..", "..");
const EXISTING_CONTENT_MAP_PATH = path.join(API_ROOT, "src", "content-enrichment", "existing-content-mux-asset-map.json");

/**
 * `_readme` dahil serbest string değerli anahtarlara izin veriyor (bilinçli —
 * `_readme` bir contentId DEĞİL, hiçbir zaman lookup edilmiyor) — burada TEK
 * gerçek kontrol, aranan `contentId` anahtarının var olup olmadığı.
 */
const existingContentMuxAssetMapSchema = z.record(z.string(), z.string().min(1));

/**
 * Saf, dosya-yolu parametreli fonksiyon (`copyMediaFile`'ın `mediaDir`
 * parametresiyle AYNI desen) — testler gerçek `EXISTING_CONTENT_MAP_PATH`'e
 * dokunmadan bir tmp fixture'la çağırabiliyor.
 */
export function resolveExistingMuxAssetId(contentId: string, mapPath: string = EXISTING_CONTENT_MAP_PATH): string {
  const rawMap: unknown = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  const map = existingContentMuxAssetMapSchema.parse(rawMap);
  const muxAssetId = map[contentId];
  if (!muxAssetId) {
    throw new VocabularyPublishMappingError(
      `"${contentId}" için "${mapPath}" içinde bir muxAssetId eşlemesi bulunamadı. ` +
        "Bu CLI SADECE daha önce (seed ile) yayınlanmış, publish-content.ts pipeline'ından hiç geçmemiş " +
        "legacy videolar için var — yeni bir video publish ediyorsanız \"pnpm publish-content\" kullanın.",
    );
  }
  return muxAssetId;
}

/**
 * `assertNotAlreadyPublished`'in TAM TERSİ yönde bir kontrol: burada videonun
 * ZATEN var OLMASI bekleniyor (backfill hedefi budur) — yoksa açıkça durur,
 * sessizce no-op geçmez.
 */
export async function findExistingVideoId(db: Database, muxAssetId: string): Promise<string> {
  const [existing] = await db.select({ id: videosTable.id }).from(videosTable).where(eq(videosTable.muxAssetId, muxAssetId));
  if (!existing) {
    throw new VocabularyPublishTargetNotFoundError(
      `"${muxAssetId}" için DB'de mevcut bir video bulunamadı — vocabulary backfill SADECE zaten yayınlanmış videolar için çalışır.`,
    );
  }
  return existing.id;
}

/**
 * Chunk 14B'nin çekirdeği: `publishContent`'in transaction'ıyla AYNI dedup/
 * idempotency garantisini (bkz. `publishVocabularyForVideo`) kullanan, ama
 * SADECE `words`/`video_words`'e dokunan dar bir transaction. `videos`,
 * `video_transcript_segments`, `transcript_segment_learning_points`,
 * `quizzes`, `quiz_options` bu fonksiyonda HİÇ referans edilmiyor — bunlara
 * write yapmanın yapısal olarak imkansız olması isteniyordu.
 */
export async function publishVocabularyToExistingVideo(
  db: Database,
  muxAssetId: string,
  vocabulary: readonly EnrichmentVocabularyItem[],
): Promise<{ videoId: string }> {
  const videoId = await findExistingVideoId(db, muxAssetId);
  await db.transaction(async (tx: PublishTransaction) => {
    await publishVocabularyForVideo(tx, videoId, vocabulary);
  });
  return { videoId };
}

/**
 * CLI'ın tüm iş mantığı (dosya I/O HARİÇ — `main()`'in sorumluluğu) TEK bu
 * fonksiyonda: quality gate → mapping → publish. Testler bunu, diske hiç
 * dokunmadan (elle kurulmuş bir `PublishDraft` + tmp mapping dosyasıyla)
 * çağırabiliyor.
 */
export async function publishVocabularyForContentId(
  db: Database,
  contentId: string,
  draft: PublishDraft,
  acknowledgeNeedsReview: boolean,
  mapPath?: string,
): Promise<{ videoId: string; muxAssetId: string }> {
  assertPassesQualityGate(draft, acknowledgeNeedsReview);
  const muxAssetId = resolveExistingMuxAssetId(contentId, mapPath);
  const { videoId } = await publishVocabularyToExistingVideo(db, muxAssetId, draft.vocabulary);
  return { videoId, muxAssetId };
}

async function main(): Promise<void> {
  const { contentId, acknowledgeNeedsReview } = parseArgs(process.argv.slice(2));

  const draft = loadPublishDraft(contentId);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new PublishPipelineError("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const { videoId, muxAssetId } = await publishVocabularyForContentId(db, contentId, draft, acknowledgeNeedsReview);
    console.error(
      `Vocabulary publish tamamlandı: video id ${videoId} (muxAssetId: ${muxAssetId}, contentId: ${contentId}) — ` +
        `${draft.vocabulary.length} vocabulary item işlendi (mevcut lemma'lar case-insensitive reuse edildi, video_words ON CONFLICT DO NOTHING).`,
    );
    console.error("videos/video_transcript_segments/transcript_segment_learning_points/quizzes/quiz_options'a HİÇBİR write yapılmadı.");
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (
      error instanceof PublishPipelineError ||
      error instanceof PublishQualityRejectedError ||
      error instanceof PublishQualityNeedsReviewError ||
      error instanceof VocabularyPublishMappingError ||
      error instanceof VocabularyPublishTargetNotFoundError
    ) {
      console.error(`\nHATA: ${error.message}`);
    } else {
      console.error("\nBEKLENMEYEN HATA:");
      console.error(error);
    }
    process.exit(1);
  });
}
