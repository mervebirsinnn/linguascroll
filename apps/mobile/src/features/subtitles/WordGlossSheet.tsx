import { useEffect, useRef, useState } from "react";
import { saveGloss } from "./api/save-gloss";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAndroidBottomSheetNavInset } from "../../shared/bottom-sheet-inset";
import { loopiStore } from "../loopi/loopi-store-instance";

export type OpenWordGloss = { word: string; gloss: string; segmentId?: string; sentence?: string };

// 2026-11-17 — userId: Loopi kuyruğu hesap başına tutulur (bkz. features/loopi/loopi-store.ts).
type WordGlossSheetProps = { entry: OpenWordGloss | null; onClose: () => void; userId: string };

/** Hazırlanmış anlamı anında gösterir. Kaydet yalnızca backend kayıt işlemi yapar; AI çağrılmaz.
 * Snapshot segment bağlamını korur; kapanan/eski panelin yanıtı yeni kelimeye taşınmaz. */
export function WordGlossSheet({ entry, onClose, userId }: WordGlossSheetProps) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  useEffect(() => {
    generation.current++; locked.current = false;
    setSaved(false); setPending(false); setNotice(null);
    return () => { generation.current++; };
  }, [entry]);
  async function save() {
    if (!entry?.segmentId || locked.current || saved) return;
    const request = generation.current;
    locked.current = true; setPending(true); setNotice(null);
    try {
      const result = await saveGloss(entry.segmentId, entry.word);
      // Loopi: yalnız sunucunun GERÇEKTEN yeni dediği kayıt (daha önce kaydedilmiş kelimeyi tekrar kaydetmek
      // created:false döner, hapa düşmez). Panel kapanmış olsa da kayıt gerçek — kuyruğa yine girer.
      if (result.created === true) loopiStore.recordWordCreated(userId, result.word.id).catch(() => {});
      if (generation.current === request) setSaved(true);
    } catch {
      if (generation.current === request) setNotice("Kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      if (generation.current === request) { locked.current = false; setPending(false); }
    }
  }
  const androidBottomSheetNavInset = useAndroidBottomSheetNavInset();
  return (
    <Modal visible={entry !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, Platform.OS === "android" && { paddingBottom: 16 + androidBottomSheetNavInset }]}
          onPress={() => {}}
        >
          {entry && (
            <View>
              <Text style={styles.word}>{entry.word}</Text>
              <Text style={styles.gloss}>{entry.gloss}</Text>
              {entry.sentence && <Text style={[styles.gloss, { marginTop: 12, fontStyle: "italic" }]}>{entry.sentence}</Text>}
              {entry.segmentId && <Pressable accessibilityRole="button" disabled={pending || saved} onPress={() => { void save(); }} style={styles.save}><Text style={styles.saveText}>{pending ? "Kaydediliyor…" : saved ? "Kelimelerine eklendi ✓" : "Kelimelerime kaydet"}</Text></Pressable>}
              {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
              <Pressable onPress={onClose} accessibilityRole="button" style={styles.save}><Text style={styles.saveText}>Videoya dön</Text></Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  save: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: "#2a2238", marginTop: 12 },
  saveText: { color: "#c8b5ff", fontSize: 15, fontWeight: "600" },
  notice: { color: "#ffc4ce", fontSize: 13, marginTop: 12 },
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
});
