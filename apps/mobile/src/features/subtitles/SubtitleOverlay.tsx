import { Pressable, StyleSheet, Text } from "react-native";
import type {
  TranscriptSegment,
  VideoVocabularyItem,
} from "@linguascroll/shared-types";
import { buildSubtitleSpans } from "./find-vocabulary-matches";

type SubtitleOverlayProps = {
  /** null ise (henüz segment başlamadı / segment'ler arası boşluk / transcript'siz video) hiçbir şey render edilmez. */
  segment: TranscriptSegment | null;
  onPress: (segment: TranscriptSegment) => void;
  /**
   * Chunk 14 — word-tap. Video'nun (segment'e değil, VİDEOYA özgü) bilinen
   * vocabulary listesi — `buildSubtitleSpans` sadece bu listedeki kelime/
   * phrase'leri, segment metninde GÜVENİLİR şekilde (tam kelime sınırı)
   * eşleştiği yerlerde ayrı, tıklanabilir bir alt-metin olarak işaretler.
   */
  vocabulary: readonly VideoVocabularyItem[];
  /**
   * Chunk 16 — `segment` de birlikte geçiriliyor: bu component zaten hangi
   * segment'in aktif olduğunu biliyor (yukarıdaki `segment` prop'u), bu yüzden
   * "kelime HANGİ cümleden tıklandı" bilgisini burada, kaynağında yakalamak
   * VideoFeedItem'da ayrı bir state senkronizasyonu gerektirmiyor.
   */
  onPressWord: (word: VideoVocabularyItem, segment: TranscriptSegment) => void;
  /**
   * Bu segment'in `kelime -> anlam` haritası (offline üretilmiş, bkz. use-word-glosses.ts).
   * undefined/boşsa kelimeler tıklanabilir olmaz — Chunk 14 davranışı aynen kalır.
   */
  glosses?: Readonly<Record<string, string>>;
  onPressGloss: (word: string, gloss: string) => void;
};

/**
 * Tıklanabilir bir altyazı satırı — video ekranının alt kısmında. Kendi
 * timing mantığını BİLMİYOR (bkz. useActiveSubtitle) — sadece "şu an hangi
 * segment aktif" bilgisini render ediyor.
 *
 * Chunk 14 — cümlenin TAMAMI hâlâ tıklanabilir (dış `Pressable`, `onPress`),
 * AMA vocabulary'de bilinen kelime/phrase'ler artık cümle içinde AYRICA,
 * kendi `onPress`'i olan iç içe bir `Text` olarak render ediliyor. RN'in
 * touch responder sistemi bunu doğru yönlendirir: bir vocabulary kelimesine
 * dokunmak SADECE `onPressWord`'ü tetikler, dış `Pressable`'ın `onPress`'ini
 * (cümle açıklaması) TETİKLEMEZ — cümlenin geri kalanına dokunmak yine eskisi
 * gibi çalışır.
 */
export function SubtitleOverlay({
  segment,
  onPress,
  vocabulary,
  onPressWord,
  glosses,
  onPressGloss,
}: SubtitleOverlayProps) {
  if (!segment) {
    return null;
  }

  const spans = buildSubtitleSpans(segment.text, vocabulary, glosses);

  return (
    <Pressable style={styles.container} onPress={() => onPress(segment)}>
      <Text style={styles.text}>
        {spans.map((span, index) =>
          span.word ? (
            <Text
              key={index}
              style={styles.vocabularyWord}
              onPress={() => onPressWord(span.word!, segment)}
            >
              {span.text}
            </Text>
          ) : span.gloss ? (
            <Text
              key={index}
              style={styles.glossWord}
              onPress={() => onPressGloss(span.text, span.gloss!)}
            >
              {span.text}
            </Text>
          ) : (
            <Text key={index}>{span.text}</Text>
          ),
        )}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(17,17,22,0.88)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(188,167,255,0.25)",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  text: {
    color: "#f5f4f9",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  vocabularyWord: { color: "#ddf9a8", textDecorationLine: "underline" },
  // Kürate kelimeden bilinçli olarak AYRI görünüm: sadece altı çizili (renk yok) —
  // yeşil vurgu "kaydedilebilir kelime" anlamını taşımaya devam ediyor.
  glossWord: { textDecorationLine: "underline" },
});
