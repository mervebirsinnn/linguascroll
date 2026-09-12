import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Feed } from './src/features/feed/components/Feed';
import { useAnonymousUserId } from './src/features/identity/use-anonymous-user-id';
import { MemoryFlow } from './src/features/memory/components/MemoryFlow';
import { OnboardingFlow } from './src/features/onboarding/OnboardingFlow';
import { useOnboardingState } from './src/features/onboarding/use-onboarding-state';

type AppMode = 'feed' | 'memory';

export default function App() {
  // Feed, quiz cevaplarını ve video watch-event'lerini bir userId'ye ihtiyaç
  // duyacak şekilde gönderiyor (bkz. Chunk 6) — bu yüzden feed'i, anonymous
  // identity hazır olmadan hiç mount etmiyoruz (identity.status === 'success'
  // DIŞINDA hiçbir dalda <Feed> render edilmiyor). Bu kontrol tek kullanım yeri
  // olan, trivial bir discriminant — ayrı bir fonksiyona çıkarmak sadece test
  // uğruna gereksiz bir production abstraction olurdu (bkz. Chunk 7 review).
  const identity = useAnonymousUserId();
  // Chunk 15 — identity'den BAĞIMSIZ, paralel bir bootstrap (saf local storage,
  // network'e hiç ihtiyaç duymuyor) — Rules of Hooks gereği koşulsuz çağrılıyor.
  const onboarding = useOnboardingState();
  // Chunk 16 — Feed ↔ Memory arasında, App.tsx'in mevcut conditional-render
  // deseninin AYNISI (bkz. onboarding gating). Bir tab/navigation FRAMEWORK'ü
  // DEĞİL: tek bir useState anahtarı. Feed birincil ürün olarak kalıyor —
  // Memory SADECE Feed'deki açık bir kullanıcı eylemiyle açılıyor.
  const [mode, setMode] = useState<AppMode>('feed');

  return (
    <>
      {identity.status === 'loading' && (
        <View style={styles.centered}>
          <Text style={styles.message}>Yükleniyor…</Text>
        </View>
      )}
      {identity.status === 'error' && (
        // Chunk 15, madde 7 — ham teknik hata mesajı (örn. "Failed to fetch")
        // artık DOĞRUDAN kullanıcıya gösterilmiyor.
        <View style={styles.centered}>
          <Text style={styles.message}>Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.</Text>
        </View>
      )}
      {identity.status === 'success' && onboarding.status === 'loading' && (
        <View style={styles.centered}>
          <Text style={styles.message}>Yükleniyor…</Text>
        </View>
      )}
      {identity.status === 'success' && onboarding.status === 'success' && !onboarding.state.completed && (
        <OnboardingFlow onComplete={onboarding.completeOnboarding} onSkip={onboarding.skipOnboarding} />
      )}
      {identity.status === 'success' && onboarding.status === 'success' && onboarding.state.completed && mode === 'feed' && (
        <Feed userId={identity.userId} preference={onboarding.state.preferences} onOpenMemory={() => setMode('memory')} />
      )}
      {identity.status === 'success' && onboarding.status === 'success' && onboarding.state.completed && mode === 'memory' && (
        <MemoryFlow userId={identity.userId} onBack={() => setMode('feed')} />
      )}
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
