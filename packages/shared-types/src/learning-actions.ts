import { z } from "zod";
import { wordSchema } from "./word";
export const saveGlossRequestSchema = z.object({ segmentId: z.string().uuid(), word: z.string().trim().min(1).max(100) });
export const saveGlossResponseSchema = z.object({ word: wordSchema, saved: z.literal(true) });
export const videoFeedbackRequestSchema = z.object({ reason: z.enum(["subtitle", "translation", "too_easy", "too_hard", "playback", "other"]), comment: z.string().trim().max(500).default("") });
export type SaveGlossResponse = z.infer<typeof saveGlossResponseSchema>;
export type VideoFeedbackRequest = z.infer<typeof videoFeedbackRequestSchema>;
