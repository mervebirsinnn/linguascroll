import { BadRequestException } from "@nestjs/common";
import { contentCategorySchema, feedScopeSchema, type ContentCategory, type FeedScope } from "@linguascroll/shared-types";

/**
 * Ana akıştan (scope "all"), ücretsiz seçkiden ve "kategori bitince bütün katalogdan beslen" yedeğinden İZOLE kategoriler.
 * Karar (2026-11-20): Cabin Crew sınav içeriği genel akışa karışmasın; yalnızca kendi akışında görünür. Yeni bir izole
 * kategori eklemek için bu listeye eklemek yeter (repository predicate'i ve ücretsiz seçki bunu kullanır).
 */
export const CATEGORIES_OUTSIDE_MAIN_FEED: readonly ContentCategory[] = ["cabincrew"];

export type VideoCatalogFilter = { category?: ContentCategory; excludeCategories?: readonly ContentCategory[] };

/** Ana akışın (ve ücretsiz seçkinin) kataloğu: izole kategoriler dışındaki her şey. */
export const MAIN_FEED_CATALOG_FILTER: VideoCatalogFilter = { excludeCategories: CATEGORIES_OUTSIDE_MAIN_FEED };

export function isIsolatedScope(scope: FeedScope): boolean {
  return scope !== "all" && CATEGORIES_OUTSIDE_MAIN_FEED.includes(scope);
}

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

/** Scope -> repository'nin DB predicate'i: "all" izole kategorileri DIŞLAR, diğerleri tek kategori. */
export function scopeToVideoFilter(scope: FeedScope): VideoCatalogFilter {
  return scope === "all" ? MAIN_FEED_CATALOG_FILTER : { category: scope };
}
