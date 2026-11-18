import {
  answerPassageQuestionRequestSchema,
  passageAnswerResultSchema,
  passagePageSchema,
  passagesQuerySchema,
  saveWordRequestSchema,
  saveWordResponseSchema,
  type PassageAnswerResult,
  type PassageLevel,
  type PassagePage,
} from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { fetchWithTimeout } from "../../../shared/fetch-with-timeout";
import { authHeaders } from "../../identity/auth-headers";

/**
 * Okuma pratiği (Okuma / Paragraf Pratiği) için ince fetch sarmalayıcıları — yalnız HTTP + wire doğrulaması; durum
 * mantığı passages-state.ts'te. Kimlik yalnız Authorization header'ında (backend token'dan çözer; userId gönderilmez).
 *
 * HTTP durumunu taşıyan tipli hata: arayüz 403'ü ("bu metin kilitli → paywall") ağ hatasından AYIRT edebilsin diye
 * (FeedFetchError ile aynı fikir; feed'e bağımlı olmamak için ayrı sınıf).
 */
export class PassagesApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly isTimeout = false,
  ) {
    super(message);
    this.name = "PassagesApiError";
  }
}

async function request(url: string, init: RequestInit, failureMessage: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchWithTimeout(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), ...(await authHeaders()) } });
  } catch (error) {
    // authHeaders() oturum yoksa kendi hatasını fırlatır: olduğu gibi geçer. Yalnız ağ/timeout (abort) çevrilir.
    if (error instanceof Error && error.name === "AbortError") throw new PassagesApiError(failureMessage, undefined, true);
    throw error;
  }
  if (!response.ok) throw new PassagesApiError(`${failureMessage}: ${response.status} ${response.statusText}`, response.status);
  return response.json();
}

/** GET /passages?level=&cursor= — cursor opak: mobil içini açmaz, bir önceki cevabın `nextCursor`'ını aynen geri yollar. */
export async function fetchPassages(level: PassageLevel, cursor?: string): Promise<PassagePage> {
  const query = passagesQuerySchema.parse({ level, cursor });
  const params = new URLSearchParams({ level: query.level });
  if (query.cursor) params.set("cursor", query.cursor);
  const json = await request(`${API_BASE_URL}/passages?${params.toString()}`, { headers: {} }, "Metinler getirilemedi");
  return passagePageSchema.parse(json);
}

/**
 * POST /passages/questions/:questionId/answer. İlk cevap kazanır: aynı soruya ikinci istek sunucudaki KAYITLI sonucu
 * döndürür, istemci bunu aynen uygular. 403 → metin kilitli (erişim yok), 400 → şık bu soruya ait değil.
 */
export async function answerPassageQuestion(questionId: string, optionId: string): Promise<PassageAnswerResult> {
  const body = answerPassageQuestionRequestSchema.parse({ optionId });
  const json = await request(
    `${API_BASE_URL}/passages/questions/${encodeURIComponent(questionId)}/answer`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    "Cevap gönderilemedi",
  );
  return passageAnswerResultSchema.parse(json);
}

/**
 * PUT /words/:wordId/saved, kaynak olarak metin + DOKUNULAN GEÇİŞ (span) ile: sunucu kaynak cümleyi o geçişten bulur (aynı
 * kelime iki cümlede geçiyorsa doğru cümle). `sourceSegmentId` ile birlikte ASLA gönderilmez (şema reddeder).
 * Kaydı geri almak için mevcut feed/api/unsave-word kullanılır (kaynaktan bağımsız).
 */
export async function savePassageWord(wordId: string, passageId: string, spanId: string): Promise<{ created: boolean | undefined }> {
  const body = saveWordRequestSchema.parse({ sourcePassageId: passageId, sourcePassageSpanId: spanId });
  const json = await request(
    `${API_BASE_URL}/words/${encodeURIComponent(wordId)}/saved`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    "Kelime kaydedilemedi",
  );
  // Okuma pratiği yalnız yeni API'de var (PUT artık { created } döner); yine de ağ JSON'u şemayla doğrulanır, cast yok.
  return { created: saveWordResponseSchema.parse(json).created };
}
