import { z } from "zod";
import { cefrLevelSchema } from "./video";

/**
 * Okuma / Paragraf Pratiği wire contract'ı (PR-1). `FeedItem` union'ına BİLİNÇLİ OLARAK dokunmuyor:
 * mobile `feedPageSchema`'yı katı parse ettiği için yeni bir union üyesi kurulu build'leri kırardı;
 * bu feature kendi endpoint'ini ve kendi şemalarını taşıyor (ayrı modül kararı).
 *
 * `passageLevelSchema` — `cefrLevelSchema`'dan TÜRETİLİR (literal'ler yeniden yazılmaz). Liste istenen
 * seviyeye göre süzüldüğü için kurulu bir build'e hiç istemediği seviye gelmez; bu yüzden daha dar
 * enum güvenli. İleride A1/A2 eklenirse yeni endpoint sürümü gerekir (bilinçli kabul).
 */
export const passageLevelSchema = cefrLevelSchema.extract(["B1", "B2", "C1", "C2"]);
export type PassageLevel = z.infer<typeof passageLevelSchema>;

/** GET /passages sorgusu: seviye zorunlu; cursor opak bir string (server-internal, client içini açmaz). */
export const passagesQuerySchema = z.object({
  level: passageLevelSchema,
  cursor: z.string().min(1).optional(),
});
export type PassagesQuery = z.infer<typeof passagesQuerySchema>;

/**
 * Paragraf içindeki dokunulabilir kelime/ifade. `saved` kullanıcıya özgü (FeedPlayableVideo'nun
 * vocabulary enrichment'ı ile aynı fikir). Kelime id'leri YALNIZCA açık (open) metinlerde gelir:
 * kilitli metnin payload'ında hiç yoktur, bu yüzden kaynaksız kayıt bir erişim bypass'ı değildir.
 */
export const passageWordRefSchema = z.object({
  wordId: z.string().uuid(),
  gloss: z.string(),
  saved: z.boolean(),
});

/**
 * Sunucu paragrafı HAZIR "run"lara böler (düz metin parçası + opsiyonel kelime). Mobile offset
 * hesabı yapmaz; tekrar eden kelime her geçişinde ayrı run'dır, çok kelimeli ifade ("account for")
 * TEK run'dır. Kesikli ifadeler MVP'de desteklenmez.
 */
export const passageRunSchema = z.object({
  text: z.string().min(1),
  word: passageWordRefSchema.optional(),
});
export const passageParagraphSchema = z.array(passageRunSchema).min(1);

/** Cevap öncesi şık: doğruluk, tuzak türü ve açıklama BİLEREK yok (cevap sonrası sonuçta gelir). */
export const passageOptionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
});

/**
 * Cevap sonucu: hem POST cevabının yanıtı hem GET'te cevaplanmış soruya eklenen durum (geri dönünce
 * korunur). Tek doğruluk kaynağı sunucunun sakladığı `correct` anlık görüntüsüdür. `trapType` ve
 * soru `type` alanları DÜZ METİN: C2 yeni bir tür getirirse eski build parse hatasına düşmez.
 */
export const passageOptionResultSchema = z.object({
  optionId: z.string().uuid(),
  isCorrect: z.boolean(),
  trapType: z.string().nullable(),
  explanation: z.string(),
});

export const passageAnswerResultSchema = z.object({
  selectedOptionId: z.string().uuid(),
  correctOptionId: z.string().uuid(),
  correct: z.boolean(),
  options: z.array(passageOptionResultSchema).min(2),
});
export type PassageAnswerResult = z.infer<typeof passageAnswerResultSchema>;

export const passageQuestionSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  prompt: z.string(),
  options: z.array(passageOptionSchema).min(2),
  /** null → kullanıcı bu soruyu henüz cevaplamadı; bu durumda anahtar ve açıklamalar HİÇ gönderilmez. */
  result: passageAnswerResultSchema.nullable(),
});
export type PassageQuestion = z.infer<typeof passageQuestionSchema>;

const passageHeaderShape = {
  id: z.string().uuid(),
  level: passageLevelSchema,
  title: z.string(),
  topic: z.string(),
};

/** Erişimi olan kullanıcı için tam metin + sorular. */
export const openPassageSchema = z.object({
  access: z.literal("open"),
  ...passageHeaderShape,
  paragraphs: z.array(passageParagraphSchema).min(1),
  questions: z.array(passageQuestionSchema).min(1),
});

/** Kilitli metin: yalnız başlık bilgisi; paragraf, soru ve kelime id'si YOK (sunucu tarafında da cevap reddedilir). */
export const lockedPassageSchema = z.object({
  access: z.literal("locked"),
  ...passageHeaderShape,
});

export const passageSchema = z.discriminatedUnion("access", [openPassageSchema, lockedPassageSchema]);
export type Passage = z.infer<typeof passageSchema>;

/** `nextCursor === null` → bu seviyenin sonu (feedPageSchema ile aynı anlam; otomatik yeniden başlama yok). */
export const passagePageSchema = z.object({
  items: z.array(passageSchema),
  nextCursor: z.string().nullable(),
});
export type PassagePage = z.infer<typeof passagePageSchema>;

/**
 * POST /passages/questions/:questionId/answer body'si. Kimlik body'de DEĞİL (Firebase token'dan çözülür);
 * `isCorrect` BİLEREK yok: doğruluğu sunucu hesaplar.
 */
export const answerPassageQuestionRequestSchema = z.object({
  optionId: z.string().uuid(),
});
export type AnswerPassageQuestionRequest = z.infer<typeof answerPassageQuestionRequestSchema>;
