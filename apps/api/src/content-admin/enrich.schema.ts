import type { z } from "zod";
import { publishDraftSchema } from "../content-enrichment/publish-draft.schema";

/**
 * Chunk 17C — `POST /content-admin/videos/:contentId/enrich`'in response contract'ı.
 * Yeni bir şekil TANIMLAMIYORUZ: `enrich-transcript.ts`'in ürettiği `enriched.json`
 * zaten `publishDraftSchema`'ya uyuyor (bkz. buildPublishDraft) — burada sadece
 * `sourceFile`'ı `.omit()` ediyoruz. `sourceFile`, bu isteğin işlendiği makinedeki
 * (STT/17B'nin geçici indirdiği, artık silinmiş) yerel bir dosya yolu — internal
 * implementation detail, `process-stt.schema.ts`'teki AYNI gerekçeyle HTTP
 * response'a asla sızdırılmamalı.
 */
export const enrichContentResponseSchema = publishDraftSchema.omit({ sourceFile: true });
export type EnrichContentResponse = z.infer<typeof enrichContentResponseSchema>;
