import { cefrLevelSchema, topicSchema, type FeedPreferences, type Topic } from "@linguascroll/shared-types";

/**
 * Chunk 15 — `GET /feed`'in opsiyonel `level`/`topics` query param'larını
 * `FeedPreferences`'a çevirir. `userId`'nin AKSİNE (ParseUUIDPipe, malformed'da
 * 400) bu ALANLAR malformed olduğunda REQUEST'İ REDDETMİYOR — preference bir
 * "nice-to-have" ranking sinyali, `userId` gibi zorunlu bir kaynak referansı
 * DEĞİL (kullanıcı kararı). Geçersiz/bilinmeyen bir değer sessizce YOK SAYILIR,
 * güvenli varsayıma (`null`/`[]`) düşülür — asla throw etmez.
 */
export function parseFeedPreferenceQuery(level: string | undefined, topics: string | undefined): FeedPreferences {
  const levelResult = level ? cefrLevelSchema.safeParse(level) : undefined;
  const parsedLevel = levelResult?.success ? levelResult.data : null;

  const parsedTopics: Topic[] = (topics ?? "")
    .split(",")
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0)
    .map((topic) => topicSchema.safeParse(topic))
    .filter((result): result is { success: true; data: Topic } => result.success)
    .map((result) => result.data);

  return { level: parsedLevel, topics: parsedTopics };
}
