import { feedPageSchema, feedScopeSchema, type FeedPage, type FeedPreferences, type FeedScope } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { getSessionSeed } from "../../../shared/session-seed";

/**
 * HTTP status'ü taşıyan tipli hata — 2026-09-30, gerçek production yük
 * testinde (500 eşzamanlı kullanıcı) sunucunun aşırı yüklenince 5xx/timeout
 * döndüğü doğrulandı. `use-feed.ts`'teki `errorMessage()` bu status'e bakarak
 * "sunucu yoğun" ile "bağlantı sorunu" mesajlarını AYIRT edebilsin diye —
 * önceden sadece düz bir `Error` fırlatılıyordu, status bilgisi kayboluyordu.
 */
export class FeedFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** 2026-10-01 — sunucu HİÇ yanıt vermeyince (bkz. FETCH_TIMEOUT_MS) true. */
    readonly isTimeout = false,
  ) {
    super(message);
    this.name = "FeedFetchError";
  }
}

/**
 * 2026-10-01 — gerçek bir gözden geçirme bulgusu: `fetch()` önceden hiçbir
 * timeout/abort taşımıyordu — sunucu TEPKİ VERMEDİĞİNDE (asılı kalan bir
 * bağlantı, ör. yük altında) istek sonsuza kadar bekleyebiliyordu, "yükleniyor"
 * ekranı asla sonlanmıyordu. 15 saniye, kullanıcıyı gereksiz bekletmeyecek
 * kadar kısa ama normal bir mobil ağ gecikmesini yanlışlıkla timeout saymayacak
 * kadar uzun bir sınır.
 */
const FETCH_TIMEOUT_MS = 15000;

/**
 * `scope` (all | animation | ielts) HER istekte gönderilir; eski `category` parametresi artık
 * ASLA gönderilmez (API'de yalnızca yayındaki eski build'ler için deprecated olarak duruyor).
 *
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
 *
 * `preference` (Chunk 15 — onboarding'in level/topics'i) SADECE `cursor` YOKKEN
 * (yeni session) query'ye eklenir — backend zaten devam isteklerinde bunu yok
 * sayıyor (bkz. feed.service.ts), burada da aynı gerçeği yansıtan tek bir
 * `if/else`, iki ayrı kod yolu DEĞİL.
 */
export async function fetchFeed(userId: string, cursor?: string, preference?: FeedPreferences, scope: FeedScope = "all"): Promise<FeedPage> {
  if (!userId) {
    throw new Error("fetchFeed userId olmadan çağrılamaz");
  }

  // `scope` (all | animation | ielts) bir DB kategorisi DEĞİL feed kapsamıdır; "Akış" = "all" (bütün kategoriler).
  const params = new URLSearchParams({ userId, scope: feedScopeSchema.parse(scope) });
  if (cursor) {
    // Devam isteği seed taşımaz: seed imzalı cursor'ın içinde (sunucu cursor'dakini kullanır).
    params.set("cursor", cursor);
  } else {
    // Yeni session: process ömürlü seed (bkz. session-seed.ts) — sekme değişimi/retry/refresh aynı seed'i kullanır.
    params.set("sessionSeed", getSessionSeed());
    if (preference) {
      if (preference.level) {
        params.set("level", preference.level);
      }
      if (preference.topics.length > 0) {
        params.set("topics", preference.topics.join(","));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/feed?${params.toString()}`, { signal: controller.signal });
  } catch (error) {
    // AbortController.abort() fetch'i bir "AbortError" ile reddettiriyor —
    // bunu genel bir network hatasından (offline, DNS, vb.) AYIRT ediyoruz:
    // ikisi kullanıcıya FARKLI bir mesaj hak ediyor (bkz. use-feed.ts'teki
    // errorMessage() — timeout artık "sunucu yoğun" ile aynı kategoride,
    // çünkü sunucunun hiç yanıt vermemesi de gerçek bir aşırı yük belirtisi).
    if (error instanceof Error && error.name === "AbortError") {
      throw new FeedFetchError("Feed isteği zaman aşımına uğradı (sunucu yanıt vermedi)", undefined, true);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new FeedFetchError(`Feed isteği başarısız oldu: ${response.status} ${response.statusText}`, response.status);
  }

  const json: unknown = await response.json();
  return feedPageSchema.parse(json);
}

