import { Pressable, StyleSheet, Text } from "react-native";
import type { TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
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
   * Chunk 16 revizyon — cihaz smoke test'inde bulunan bug: vocabulary listesi
   * sabit bir alt panel olduğunda, uzun bir listede yukarı doğru büyüyüp bu
   * overlay'in SABİT `bottom` değerinin üstüne biniyordu. Kalıcı çözüm zIndex
   * DEĞİL (iki view'ın aynı alanı paylaşmasını gizler ama önlemez) — VideoFeedItem
   * artık vocabulary paneli collapsed/expanded bir bottom-sheet yaptığı için,
   * panel açıkken bu overlay'in GERÇEKTEN panelin üstüne, ondan bağımsız bir
   * dikey alanda oturması gerekiyor. `bottomOffset`, VideoFeedItem'ın o anki
   * panel yüksekliğine göre hesapladığı değeri geçirir — panel kapalıyken
   * varsayılan (eski, sabit) konuma döner.
   */
  bottomOffset: number;
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
export function SubtitleOverlay({ segment, onPress, vocabulary, onPressWord, bottomOffset }: SubtitleOverlayProps) {
  if (!segment) {
    return null;
  }

  const spans = buildSubtitleSpans(segment.text, vocabulary);

  return (
    <Pressable style={[styles.container, { bottom: bottomOffset }]} onPress={() => onPress(segment)}>
      <Text style={styles.text}>
        {spans.map((span, index) =>
          span.word ? (
            <Text key={index} style={styles.vocabularyWord} onPress={() => onPressWord(span.word!, segment)}>
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
    position: "absolute",
    left: 16,
    right: 16,
    // `bottom` artık statik değil — render'da `bottomOffset` prop'uyla ezilir
    // (bkz. yukarı). Buradaki 96, sadece bottomOffset hiç geçirilmezse (olmaz,
    // prop required) diye bir fallback DEĞİL, StyleSheet tip bütünlüğü için.
    bottom: 96,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    // Savunma amaçlı ek katman (birincil çözüm `bottomOffset`): iki view aynı
    // dikey aralığı hiç paylaşmamalı, ama olası bir hesap hatasında bile
    // subtitle'ın en üstte kalmasını garanti eder.
    zIndex: 10,
    elevation: 10,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  vocabularyWord: {
    color: "#8ecdfa",
    textDecorationLine: "underline",
  },
});
