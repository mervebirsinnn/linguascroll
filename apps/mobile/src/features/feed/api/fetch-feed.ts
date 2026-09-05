import { feedPageSchema, type FeedPage } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

/**
 * GET /feed'i çağırır ve sonucu feedPageSchema ile doğrular. Bu doğrulama
 * atlanmıyor: network'ten gelen JSON, tip sisteminin hiçbir garanti veremediği tek
 * sınır — `as FeedPage` gibi bir unchecked cast burada bir hatayı gizler,
 * ortaya çıkarmaz.
 *
 * userId zorunlu (Chunk 7 — personalized feed). undefined/null/boş string URL'ye
 * hiç serialize edilmemeli: bu güvenceyi çağıranın disiplinine (App.tsx'in
 * identity-resolved gating'i) bırakmak yerine burada da açıkça kontrol ediyoruz —
 * bir bug elsewhere boş bir string'i buraya sızdırsa bile (TypeScript "" için
 * hiçbir uyarı vermez), backend'e hiç gitmeden fail-fast patlar.
 *
 * `cursor` (Chunk 8) — opaque bir string, mobile onun İÇİNİ HİÇ parse etmiyor;
 * sadece bir önceki `fetchFeed` çağrısının döndürdüğü `nextCursor`'ı olduğu gibi
 * geri gönderiyor. Verilmezse (ilk istek / yeni session) query'ye hiç eklenmiyor.
 */
export async function fetchFeed(userId: string, cursor?: string): Promise<FeedPage> {
  if (!userId) {
    throw new Error("fetchFeed userId olmadan çağrılamaz");
  }

  const params = new URLSearchParams({ userId });
  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`${API_BASE_URL}/feed?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Feed isteği başarısız oldu: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return feedPageSchema.parse(json);
}
