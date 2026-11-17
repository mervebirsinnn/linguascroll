/**
 * Bir paragrafı + span satırlarını, istemcinin offset hesabı yapmadan çizebileceği HAZIR "run"lara böler
 * (bkz. shared-types passageRunSchema). Saf fonksiyon: DB'ye veya kimliğe dokunmaz.
 *
 * Tutarsız veri (aralık dışı, çakışan span, surface ile metnin uyuşmaması) SESSİZCE düzeltilmez ve atlanmaz: yayın
 * doğrulayıcısının zaten engellemesi gereken bir veri bütünlüğü hatasıdır, bu yüzden burada açıkça patlar —
 * yanlış yerde vurgulanmış bir kelime, yanlış anlamı yanlış kelimeye bağlamaktan kötüdür.
 */
export type RunSpan = { start: number; end: number; wordId: string; surface: string };
export type RunWordInfo = { gloss: string; saved: boolean };
export type PassageRun = { text: string; word?: { wordId: string; gloss: string; saved: boolean } };

export function buildParagraphRuns(paragraph: string, spans: readonly RunSpan[], words: ReadonlyMap<string, RunWordInfo>): PassageRun[] {
  if (paragraph.length === 0) {
    throw new Error("Boş paragraf: bir paragraf en az bir karakter içermeli");
  }
  const ordered = [...spans].sort((a, b) => a.start - b.start);
  const runs: PassageRun[] = [];
  let cursor = 0;

  for (const span of ordered) {
    if (span.start < cursor) {
      throw new Error(`Çakışan span: [${span.start}, ${span.end}) "${span.surface}"`);
    }
    if (span.end > paragraph.length) {
      throw new Error(`Span paragraf dışında: [${span.start}, ${span.end}) uzunluk ${paragraph.length}`);
    }
    if (paragraph.slice(span.start, span.end) !== span.surface) {
      throw new Error(`Span metinle uyuşmuyor: [${span.start}, ${span.end}) beklenen "${span.surface}"`);
    }
    const info = words.get(span.wordId);
    if (!info) {
      throw new Error(`Span kelimesi bulunamadı: "${span.wordId}"`);
    }

    if (span.start > cursor) {
      runs.push({ text: paragraph.slice(cursor, span.start) });
    }
    runs.push({ text: span.surface, word: { wordId: span.wordId, gloss: info.gloss, saved: info.saved } });
    cursor = span.end;
  }

  if (cursor < paragraph.length) {
    runs.push({ text: paragraph.slice(cursor) });
  }
  return runs;
}
