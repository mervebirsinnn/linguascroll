import { z } from "zod";

// Bölüm seçimi topic/CEFR tercihinden bağımsız, açık bir katalog filtresidir.
export const contentCategorySchema = z.enum(["general", "animation"]);
export type ContentCategory = z.infer<typeof contentCategorySchema>;

const sourceLinkSchema = z.string().url().startsWith("https://");
// Lisans bilgisi serbest JSON değildir: API/mobile sınırında aynı sabit şekil doğrulanır.
export const videoAttributionSchema = z.object({
  title: z.string().min(1),
  credit: z.string().min(1),
  sourceUrl: sourceLinkSchema,
  license: z.string().min(1),
  licenseUrl: sourceLinkSchema,
  changes: z.string().min(1),
});
export type VideoAttribution = z.infer<typeof videoAttributionSchema>;
