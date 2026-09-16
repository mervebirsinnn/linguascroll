import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * `preferences/storage.ts` ile AYNI desen: tek bir gerçek ihtiyaç (vocabulary
 * word-tap ipucu bir kez gösterildi mi?), genel bir "hints" katmanı DEĞİL —
 * kullanıcı kararı zaten SADECE bu tek ipucunu istiyor (madde 10'daki subtitle
 * hint'i BİLİNÇLİ OLARAK eklenmedi).
 */
const VOCABULARY_HINT_SEEN_KEY = "linguascroll.hasSeenVocabularyHint";

export async function getHasSeenVocabularyHint(): Promise<boolean> {
  return (await AsyncStorage.getItem(VOCABULARY_HINT_SEEN_KEY)) === "true";
}

export async function markVocabularyHintSeen(): Promise<void> {
  await AsyncStorage.setItem(VOCABULARY_HINT_SEEN_KEY, "true");
}
