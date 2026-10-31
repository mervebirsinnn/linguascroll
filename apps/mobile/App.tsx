import { useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { Feed } from './src/features/feed/components/Feed';
import { SignInScreen } from './src/features/identity/SignInScreen';
import { useAuth } from './src/features/identity/use-auth';
import { MemoryFlow } from './src/features/memory/components/MemoryFlow';
import { OnboardingFlow } from './src/features/onboarding/OnboardingFlow';
import { useOnboardingState } from './src/features/onboarding/use-onboarding-state';
import type { AccountLinkControl } from './src/features/identity/auth-state';
import { initializePurchases } from './src/features/subscription/purchases-gateway';

type AppMode = 'feed' | 'memory';

function App() {
  // 2026-10-27 — gerçek hesap: Firebase Authentication. Feed/onboarding yalnızca bir Firebase
  // oturumu VE backend kullanıcısı varken mount edilir (auth.state.status === 'signedIn').
  // 2026-10-28 — bu oturum ilk açılışta otomatik bir MİSAFİR (anonim) oturum: ilk 10 video
  // girişsiz; Google girişi paywall'da (ya da Kelimelerim > Giriş yap) bu hesaba bağlanır
  // (bkz. auth-state.ts). Eski (2026-10 öncesi) AsyncStorage anonim UUID'si hâlâ kullanılmıyor.
  const auth = useAuth();
  const identity = auth.state.status === 'signedIn' ? { status: 'success' as const, userId: auth.state.userId } : { status: 'pending' as const };
  const signedIn = auth.state.status === 'signedIn' ? auth.state : null;
  const linkAccount = auth.linkAccount;
  // Referans yalnızca içerik değişince yenilenir: Feed'in FlatList'i bunu extraData olarak izliyor.
  const account = useMemo<AccountLinkControl>(
    () => ({
      isAnonymous: signedIn?.session.isAnonymous ?? false,
      linking: signedIn?.linking ?? false,
      notice: signedIn?.notice ?? null,
      onLinkAccount: linkAccount,
      onDeleteAccount: auth.deleteAccount,
    }),
    [signedIn?.session.isAnonymous, signedIn?.linking, signedIn?.notice, linkAccount, auth.deleteAccount],
  );
  // Chunk 15 — identity'den BAĞIMSIZ, paralel bir bootstrap (saf local storage,
  // network'e hiç ihtiyaç duymuyor) — Rules of Hooks gereği koşulsuz çağrılıyor.
  const onboarding = useOnboardingState();
  // Chunk 16 — Feed ↔ Memory arasında, App.tsx'in mevcut conditional-render
  // deseninin AYNISI (bkz. onboarding gating). Bir tab/navigation FRAMEWORK'ü
  // DEĞİL: tek bir useState anahtarı. Feed birincil ürün olarak kalıyor —
  // Memory SADECE Feed'deki açık bir kullanıcı eylemiyle açılıyor.
  const [mode, setMode] = useState<AppMode>('feed');

  // RevenueCat'in appUserID'si, backend'in entitlement sorgusunda kullandığı SABİT backend
  // kullanıcı id'si (GET /me) ile AYNI olmalı — bu yüzden giriş tamamlanınca (ve sadece o zaman)
  // yapılandırılıyor; başka hesapla girişte kimlik değiştiriliyor (logIn). Anahtar tanımsızsa
  // (EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY) sessizce atlanır: satın alma kapalı kalır.
  const identityUserId = identity.status === 'success' ? identity.userId : null;
  useEffect(() => {
    if (identityUserId === null) return;
    initializePurchases(identityUserId).catch((error: unknown) => {
      Sentry.captureException(error);
    });
  }, [identityUserId]);

  return (
    // bottom-sheet-inset.ts'teki useAndroidBottomSheetNavInset() (ve dolayısıyla
    // Android sistem nav bar payına ihtiyaç duyan üç bottom-sheet/CTA) bu
    // Provider'a bağımlı — initialMetrics, native modülün ilk raporundan önceki
    // olası boş/flash render'ı önlüyor (react-native-safe-area-context'in kendi
    // önerdiği desen).
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {(auth.state.status === 'initializing' || auth.state.status === 'startingGuest' || auth.state.status === 'loadingUser') && (
        <View style={styles.centered}>
          <Text style={styles.message}>Yükleniyor…</Text>
        </View>
      )}
      {auth.state.status === 'unconfigured' && (
        <View style={styles.centered}>
          <Text style={styles.message}>Giriş şu an kullanılamıyor (uygulama yapılandırması eksik).</Text>
        </View>
      )}
      {(auth.state.status === 'signedOut' || auth.state.status === 'signingIn') && (
        <SignInScreen
          busy={auth.state.status === 'signingIn'}
          notice={auth.state.status === 'signedOut' ? auth.state.notice : null}
          onSignIn={auth.signIn}
        />
      )}
      {(auth.state.status === 'userLoadFailed' || auth.state.status === 'guestFailed') && (
        // Chunk 15, madde 7 — ham teknik hata mesajı (örn. "Failed to fetch")
        // DOĞRUDAN kullanıcıya gösterilmiyor.
        <View style={styles.centered}>
          <Text style={styles.message}>Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.</Text>
          <Pressable
            onPress={auth.state.status === 'guestFailed' ? auth.retryGuest : auth.retryUser}
            accessibilityRole="button"
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Tekrar dene</Text>
          </Pressable>
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
        <Feed key={identity.userId} userId={identity.userId} preference={onboarding.state.preferences} account={account} onOpenMemory={() => setMode('memory')} />
      )}
      {identity.status === 'success' && onboarding.status === 'success' && onboarding.state.completed && mode === 'memory' && (
        <MemoryFlow
          key={identity.userId}
          userId={identity.userId}
          onBack={() => setMode('feed')}
          onSignOut={() => {
            setMode('feed');
            auth.signOut();
          }}
          account={account}
        />
      )}
      <StatusBar style="light" />
    </SafeAreaProvider>
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
  retryButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

// Sentry.wrap: native crash'leri JS tarafındaki son event'e bağlıyor (Sentry'nin
// resmi RN entegrasyon deseni) — sadece Sentry.init (instrument.ts) çalıştıktan
// sonra register edilecek şekilde index.ts'in import sırasına bağımlı.
export default Sentry.wrap(App);
