import { z } from "zod";
import { cefrLevelSchema, topicSchema } from "@linguascroll/shared-types";
import { isValidContentId } from "./build-storage-key";

/**
 * Chunk 17 — `POST /content-admin/videos/upload`'ın multipart body'sindeki
 * dosya-DIŞI alanları doğrular (dosyanın kendisi ayrı, `ContentAdminService`'te
 * kontrol ediliyor — bkz. o dosyadaki yorum). shared-types'a EKLENMEDİ: bu,
 * mobile'ın hiç çağırmadığı, sadece API-içi bir admin endpoint'i — shared-types
 * sadece API/mobile arasındaki wire contract'lar için (bkz. CLAUDE.md).
 *
 * topic/level, videoSchema'daki AYNI enum'ları reuse ediyor (yeni bir kopya
 * DEĞİL) — bu chunk'ta hiçbir yere yazılmıyorlar (bkz. ContentAdminService),
 * sadece ileride publish-content.ts'in ihtiyaç duyacağı şekli baştan
 * doğrulamak için burada duruyorlar.
 *
 * contentId deseni `build-storage-key.ts`'teki `isValidContentId`'den reuse
 * ediliyor — TEK bir "geçerli contentId ne demek" tanımı (storage key'in
 * kendisiyle burada iki farklı kopya riski yok).
 */
export const uploadVideoRequestSchema = z.object({
  contentId: z.string().refine(isValidContentId, 'contentId "a-z0-9-" (kebab-case) deseninde olmalı'),
  title: z.string().min(1).optional(),
  topic: topicSchema.optional(),
  level: cefrLevelSchema.optional(),
});
export type UploadVideoRequest = z.infer<typeof uploadVideoRequestSchema>;

export const uploadVideoResponseSchema = z.object({
  contentId: z.string(),
  storageKey: z.string(),
  playbackUrl: z.string().url(),
  originalFilename: z.string(),
  sizeBytes: z.number().int().positive(),
});
export type UploadVideoResponse = z.infer<typeof uploadVideoResponseSchema>;
