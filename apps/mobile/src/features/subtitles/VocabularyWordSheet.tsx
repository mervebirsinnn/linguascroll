import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAndroidBottomSheetNavInset } from "../../shared/bottom-sheet-inset";

/**
 * Pencerede gösterilen GÖRÜNTÜ modeli. Bilerek `VideoVocabularyItem` değil: video akışı sözlük biçimini (lemma), okuma
 * pratiği ise metinde göründüğü hâliyle dokunulan ifadeyi gösterir; ikisinin ortak yeri başlık + anlamdır. Çağıran her akış
 * kendi alanlarını buraya çevirir (alan uydurmadan; bkz. passages/passage-word-entry.ts).
 */
export type WordSheetEntry = { title: string; gloss: string };

type VocabularyWordSheetProps = {
  /**
   * Tıklandığı ANDAKİ kelimenin snapshot'ı — null ise sheet kapalı.
   * `ExplanationSheet`'teki `segment` prop'uyla AYNI desen (bkz. o dosyanın
   * yorumu) — çağıranda sabitlenir, sheet açıkken değişmez.
   */
  entry: WordSheetEntry | null;
  /** 2026-11-17 — kelimenin dokunulduğu cümle (WordGlossSheet'teki gibi bağlam olarak gösterilir). */
  sentence?: string;
  /** "Videoya dön" (video akışı) ya da "Metne dön" (okuma pratiği): kapatma düğmesinin bağlama uygun metni. */
  closeLabel?: string;
  onClose: () => void;
  isSaved: boolean;
  isPending: boolean;
  /**
   * 2026-11-19 — son kaydet/çıkar işlemi BAŞARISIZ olduysa kullanıcıya görünür mesaj (verilmezse hata gösterilmez: video
   * akışının saved-state hook'u hatayı yutuyor, bkz. use-saved-word-ids.ts). Mesajla birlikte "Tekrar dene" çıkar: başarısız
   * işlem durumu değiştirmediği için yeniden deneme yönü kayıt durumundan bellidir (kayıtlıysa çıkar, değilse kaydet).
   */
  error?: string | null;
  /**
   * 2026-11-19 — iki AYRI niyet (eskiden tek `onToggleSave`): "kaydet" ve "çıkar". Çağıran her birini yalnız kelimenin gerçek
   * durumu o niyetle uyuşuyorsa uygular; böylece bir düğme, durum/prop kayması yüzünden yanlış yönde (kaydetmek yerine
   * silmek gibi) çalışamaz ve testler iki eylemi ayırt edebilir.
   */
  onSave: () => void;
  onRemove: () => void;
};

/**
 * Chunk 14 — word-tap akışının son adımı: subtitle → (bilinen) kelime → bu
 * sheet → meaning + save. `ExplanationSheet`'in AYNI Modal deseni (yeni bir
 * bottom-sheet dependency YOK), EN/TR dil toggle'ı YOK (gloss tek, sabit dilde).
 *
 * 2026-11-17 — görünüm altyazı kelimesi penceresiyle (WordGlossSheet) BİRLEŞTİRİLDİ (ürün kararı: kullanıcı
 * iki farklı kelime penceresi görmesin). Aynı kart, aynı yazı/renkler, cümle bağlamı, "Kelimelerime kaydet"
 * ve kapatma düğmesi. Kaydetme/çıkarma çağıranın tek saved-state'inden geçer. Eski pencere kayıtlı kelimeyi
 * aynı düğmeyle çıkarabiliyordu; bu yetenek kaybolmasın diye kayıtlıyken ayrı, düşük vurgulu bir "Kelimelerimden çıkar"
 * düğmesi var — ana düğme WordGlossSheet'teki gibi kayıtlıyken pasif (yanlışlıkla çıkarma olmasın).
 *
 * 2026-11-19 (bağımsız review): "çıkar" satırı HER DURUMDA yerleşimde yer tutar (kayıtlı değilken görünmez ve dokunulamaz,
 * erişilebilirlik ağacından gizli). Aksi halde kayıt tamamlanınca satır "kapat"ın altına eklenip kartı 48 px yukarı
 * kaydırıyor ve kapatmaya niyetlenen dokunuş kelimeyi SİLİYORDU (kart ekranın altına yaslı). Aynı sebeple hata satırı
 * düğmelerin ÜSTÜNE eklenir: kart alta yaslı olduğu için üstüne eklenen içerik düğmelerin ekrandaki yerini değiştirmez.
 *
 * 2026-11-19 (okuma pratiği): `entry`/`closeLabel`/`error` ile genelleştirildi; ikinci bir kelime penceresi AÇILMADI.
 */
export function VocabularyWordSheet({ entry, sentence, closeLabel = "Videoya dön", onClose, isSaved, isPending, error, onSave, onRemove }: VocabularyWordSheetProps) {
  const androidBottomSheetNavInset = useAndroidBottomSheetNavInset();
  // Bekleme sırasında hangi yönde işlem yapıldığı (kaydet/çıkar): etiket yanlış yönü söylemesin ("Kaydediliyor…" çıkarırken).
  const [intent, setIntent] = useState<"save" | "remove">("save");
  // Bekleme bitince VEYA pencere kapanınca (başka kelimeyle yeniden açılabilir) niyet sıfırlanır: eski kelimenin yönü sızmaz.
  useEffect(() => {
    if (!isPending || entry === null) setIntent("save");
  }, [isPending, entry]);

  // Çıkar satırı kayıtlıyken görünür; bekleme sırasında görünür ama pasif (erişilebilirlik odağı kaybolmasın).
  const removeVisible = isSaved;
  const removeEnabled = isSaved && !isPending;
  return (
    <Modal visible={entry !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            // iOS'un mevcut layout'u (sadece styles.card.padding) cihaz testinde
            // doğru çalıştığı için BİLEREK dokunulmuyor — bu ek stil SADECE
            // Android'de uygulanıyor (bkz. bottom-sheet-inset.ts).
            Platform.OS === "android" && { paddingBottom: 16 + androidBottomSheetNavInset },
          ]}
          onPress={() => {}}
        >
          {entry && (
            <View>
              <Text style={styles.word}>{entry.title}</Text>
              <Text style={styles.gloss}>{entry.gloss}</Text>
              {sentence && <Text style={[styles.gloss, styles.sentence]}>{sentence}</Text>}
              {error ? (
                <View style={styles.errorBox}>
                  <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isPending}
                    onPress={() => {
                      if (isSaved) {
                        setIntent("remove");
                        onRemove();
                      } else {
                        setIntent("save");
                        onSave();
                      }
                    }}
                    style={styles.retry}
                  >
                    <Text style={styles.retryText}>Tekrar dene</Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isPending || isSaved, busy: isPending }}
                disabled={isPending || isSaved}
                onPress={() => {
                  setIntent("save");
                  onSave();
                }}
                style={styles.save}
              >
                {/* Canlı bölge (Android): durum değişimi ("Kaydediliyor…" → "Kelimelerine eklendi ✓") ekran okuyucuya duyurulur. */}
                <Text accessibilityLiveRegion="polite" style={styles.saveText}>
                  {isPending ? (intent === "remove" ? "Kaldırılıyor…" : "Kaydediliyor…") : isSaved ? "Kelimelerine eklendi ✓" : "Kelimelerime kaydet"}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} accessibilityRole="button" style={styles.save}>
                <Text style={styles.saveText}>{closeLabel}</Text>
              </Pressable>
              {/* Yer tutan satır: her zaman bağlı (yerleşim sabit); kayıtsızken görünmez + dokunulamaz + erişilebilirlik ağacında yok. */}
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Kelimeyi kayıtlı kelimelerinden siler"
                accessibilityState={{ disabled: !removeEnabled }}
                accessibilityElementsHidden={!removeVisible}
                importantForAccessibility={removeVisible ? "yes" : "no-hide-descendants"}
                disabled={!removeEnabled}
                onPress={() => {
                  setIntent("remove");
                  onRemove();
                }}
                pointerEvents={removeVisible ? "auto" : "none"}
                style={[styles.remove, !removeVisible && styles.removeHidden, removeVisible && !removeEnabled && styles.removeDimmed]}
              >
                <Text style={styles.removeText}>Kelimelerimden çıkar</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// WordGlossSheet.tsx ile aynı değerler (iki pencere görsel olarak aynı kalsın).
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    backgroundColor: "#111",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  word: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  gloss: {
    color: "#ddd",
    fontSize: 16,
  },
  sentence: { marginTop: 12, fontStyle: "italic" },
  save: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: "#2a2238", marginTop: 12 },
  saveText: { color: "#c8b5ff", fontSize: 15, fontWeight: "600" },
  // "Videoya dön"/kapat düğmesinden ayrı durması için 12 px (yanlışlıkla çıkarma ihtimalini azaltır).
  remove: { minHeight: 44, justifyContent: "center", alignItems: "center", marginTop: 12 },
  // Kayıtsızken yerini korur ama görünmez (yerleşim kaymasın). minHeight/marginTop DEĞİŞMEZ (testle sabitlenir).
  removeHidden: { opacity: 0 },
  removeDimmed: { opacity: 0.5 },
  removeText: { color: "#9a93ab", fontSize: 13, fontWeight: "600" },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#2b1518", gap: 8 },
  errorText: { color: "#ffb4b4", fontSize: 14 },
  retry: { minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: "#3a1d21" },
  retryText: { color: "#ffd6d6", fontSize: 14, fontWeight: "700" },
});
