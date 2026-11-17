import { z } from "zod";
import { wordSchema } from "./word";
export const saveGlossRequestSchema = z.object({ segmentId: z.string().uuid(), word: z.string().trim().min(1).max(100) });
// 2026-11-17 — Loopi: `created` = bu istek user_saved_words'e GERÇEKTEN yeni satır ekledi mi (DB'deki
// INSERT ... ON CONFLICT DO NOTHING RETURNING sonucundan, tahmin değil). Opsiyonel çünkü yeni mobil eski
// API ile eşleşebilir (Render geri alma); mobil "yok"u "bilinmiyor" okur, Loopi kuyruğuna almaz. API her
// zaman doldurur. Eski istemciler fazla alanı z.object'in varsayılan davranışıyla sessizce atar.
export const saveGlossResponseSchema = z.object({ word: wordSchema, saved: z.literal(true), created: z.boolean().optional() });
export const videoFeedbackRequestSchema = z.object({ reason: z.enum(["subtitle", "translation", "too_easy", "too_hard", "playback", "other"]), comment: z.string().trim().max(500).default("") });
export type SaveGlossResponse = z.infer<typeof saveGlossResponseSchema>;
export type VideoFeedbackRequest = z.infer<typeof videoFeedbackRequestSchema>;
