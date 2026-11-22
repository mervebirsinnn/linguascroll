import { z } from "zod";
import { contentCategorySchema } from "./content-category";

/**
 * Feed'in HANGİ içerik kümesini gösterdiği — persist edilen `ContentCategory`'den AYRI bir kavram:
 *  - "all": ana akışa ait kategoriler (mobilde "Akış"; "cabincrew" HARİÇ, o ayrı bir akıştır). Bir DB değeri
 *    DEĞİLDİR; hiçbir video `category = "all"` olamaz ve DB'ye asla yazılmaz.
 *  - "animation" / "ielts" / "cabincrew": yalnızca o kategorideki içerik.
 * Kategori değerleri `contentCategorySchema`'dan TÜRETİLİR (`general` hariç: ayrı bir "yalnızca
 * general" sekmesi yok, general içerik "all" altında görünür) — aynı string'ler ikinci bir yerde tekrar yazılmaz.
 */
export const scopedContentCategorySchema = contentCategorySchema.exclude(["general"]);
export const feedScopeSchema = z.union([z.literal("all"), scopedContentCategorySchema]);
export type FeedScope = z.infer<typeof feedScopeSchema>;
