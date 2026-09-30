import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * SADECE Android için: sistem navigasyon çubuğunun (3-tuş veya gesture bar)
 * bottom-sheet tarzı içeriği kapladığı pay. iOS bu değeri HİÇ kullanmıyor —
 * mevcut iOS layout'u zaten doğru çalışıyordu (cihaz testinde doğrulandı), bu
 * yüzden iOS için ayrı bir "shared inset" kavramı/dalı KASITLI OLARAK yok.
 *
 * ÖNCEKİ YAKLAŞIM (artık YANLIŞ, cihaz testinde doğrulandı): `Dimensions.get('screen')`
 * ile `Dimensions.get('window')` farkı. Android 15+/16'nın ZORUNLU edge-to-edge
 * modunda uygulamanın çizim alanı (`window`) artık fiziksel ekranla (`screen`)
 * HER ZAMAN eşit — sistem nav bar'ı içeriği küçültmüyor, üstüne overlay ediyor.
 * Bu yüzden o fark HER ZAMAN 0 dönüyordu ve bu dosyayı kullanan üç yer de
 * (VideoFeedItem, ExplanationSheet, VocabularyWordSheet) gerçekte hiç
 * düzeltilmemiş oluyordu — iki ayrı gerçek cihaz build'inde doğrulanan bug.
 *
 * DOĞRU YAKLAŞIM: `react-native-safe-area-context`'in `useSafeAreaInsets()`'i —
 * native WindowInsets API'sinin gerçek, edge-to-edge'de de doğru çalışan
 * karşılığı. `App.tsx`'teki `SafeAreaProvider` altında çağrılması gerekiyor.
 */
export function useAndroidBottomSheetNavInset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === "android" ? insets.bottom : 0;
}
