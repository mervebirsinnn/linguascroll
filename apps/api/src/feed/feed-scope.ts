import { BadRequestException } from "@nestjs/common";
import { contentCategorySchema, feedScopeSchema, type ContentCategory, type FeedScope } from "@linguascroll/shared-types";

/**
 * `GET /feed`'in HTTP sınırı: hangi içerik kümesi istendiğini ÇÖZER (HTTP concern, service'e girmez).
 *
 *  1. `scope` verilmişse tek doğruluk kaynağıdır; bilinmeyen değer 400.
 *  2. @deprecated `scope` yoksa, YAYINDAKİ ESKİ mobile build'lerin `category` parametresi desteklenir (geriye uyum):
 *     eski "Akış" `category=general` gönderiyordu → artık "all"; `animation`/`ielts` aynen kalır; bilinmeyen 400.
 *  3. İkisi de yoksa "all".
 * Yeni mobile kod bu yolu KULLANMAZ (her istekte `scope` gönderir); legacy `category` desteği, yayındaki
 * eski build'ler kalmadığında kaldırılmalıdır. Başka hiçbir yerde (service/cursor) `category` kavramı yoktur.
 * "all" bir ContentCategory değildir; `category=all` geçerli DEĞİLDİR (400).
 */
export function resolveFeedScope(scope: string | undefined, legacyCategory: string | undefined): FeedScope {
  if (scope !== undefined) {
    const parsedScope = feedScopeSchema.safeParse(scope);
    if (!parsedScope.success) throw new BadRequestException("Geçersiz feed scope");
    return parsedScope.data;
  }
  if (legacyCategory !== undefined) {
    const parsedCategory = contentCategorySchema.safeParse(legacyCategory);
    if (!parsedCategory.success) throw new BadRequestException("Geçersiz içerik kategorisi");
    return parsedCategory.data === "general" ? "all" : parsedCategory.data;
  }
  return "all";
}

/** Scope -> repository'nin DB predicate'i: "all" için predicate YOK (undefined), diğerleri tek kategori. */
export function scopeToCategoryFilter(scope: FeedScope): ContentCategory | undefined {
  return scope === "all" ? undefined : scope;
}
