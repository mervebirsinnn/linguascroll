import type { Passage } from "@linguascroll/shared-types";

type OpenPassage = Extract<Passage, { access: "open" }>;
export type PassageRun = OpenPassage["paragraphs"][number][number];

/**
 * Paragraftaki dokunulan kelime/ifadenin kelime penceresi (ortak VocabularyWordSheet, PR #14) için GÖRÜNTÜ modeli.
 *
 * NEDEN VideoVocabularyItem'a dönüştürülmüyor: o tip `word.lemma` (sözlük biçimi) ve `word.language` ister; paragraf
 * sözleşmesi bunları TAŞIMAZ (run yalnız dokunulan YÜZEY metni, gloss, geçiş kimliği ve cümleyi verir). Yüzey metnini lemma
 * gibi göstermek ("accounted for" yazısını sözlük girdisi sanmak) ya da dili/lemmayı uydurup tipi doldurmak yanlış bilgi
 * olurdu. Bu yüzden burada yalnız sözleşmede GERÇEKTEN olan alanlar var; başlık = metinde göründüğü haliyle dokunulan ifade.
 * Pencere bu modeli gösterecek şekilde (başlık/anlam/cümle) UI aşamasında, PR #14 master'a girdikten sonra ortak sheet'te
 * genelleştirilir (ikinci bir sheet açılmaz). Sözlük biçimini ayrıca göstermek istenirse bu bir SÖZLEŞME kararıdır (run'a
 * `lemma` eklenmesi); o zamana kadar gösterilmez.
 */
export type PassageWordSheetEntry = {
  wordId: string;
  spanId: string;
  passageId: string;
  /** Metinde göründüğü haliyle dokunulan ifade (lemma DEĞİL). */
  displayText: string;
  gloss: string;
  /** Bu GEÇİŞİN cümlesi (kaydedilen kaynak cümle ile aynı). */
  sentence: string;
  saved: boolean;
};

export function toWordSheetEntry(passageId: string, run: PassageRun): PassageWordSheetEntry | null {
  if (!run.word) return null;
  return {
    wordId: run.word.wordId,
    spanId: run.word.spanId,
    passageId,
    displayText: run.text,
    gloss: run.word.gloss,
    sentence: run.word.contextSentence,
    saved: run.word.saved,
  };
}
