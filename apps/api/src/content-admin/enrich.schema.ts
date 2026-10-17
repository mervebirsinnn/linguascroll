import { z } from "zod";
import { contentCategorySchema } from "@linguascroll/shared-types";
import { publishDraftObjectSchema } from "../content-enrichment/publish-draft.schema";

/**
 * Chunk 17C — `POST /content-admin/videos/:contentId/enrich`'in response contract'ı.
 * Yeni bir şekil TANIMLAMIYORUZ: `enrich-transcript.ts`'in ürettiği `enriched.json`
 * zaten `publishDraftSchema`'ya uyuyor (bkz. buildPublishDraft) — burada sadece
 * `sourceFile`'ı `.omit()` ediyoruz. `sourceFile`, bu isteğin işlendiği makinedeki
 * (STT/17B'nin geçici indirdiği, artık silinmiş) yerel bir dosya yolu — internal
 * implementation detail, `process-stt.schema.ts`'teki AYNI gerekçeyle HTTP
 * response'a asla sızdırılmamalı.
 */
export const enrichContentResponseSchema = publishDraftObjectSchema.omit({ sourceFile: true });
export type EnrichContentResponse = z.infer<typeof enrichContentResponseSchema>;

/**
 * `POST /content-admin/videos/:contentId/enrich` request body'si — TAMAMEN opsiyonel (body hiç gönderilmezse
 * `{}` sayılır, mevcut davranış korunur). `category` shared-types'taki ContentCategory ile doğrulanır
 * (ayrı bir union YOK); verilmezse draft'a hiçbir category yazılmaz (publish "general" varsayar).
 */
export const enrichContentRequestSchema = z.object({ category: contentCategorySchema.optional() }).strict();
export type EnrichContentRequest = z.infer<typeof enrichContentRequestSchema>;
