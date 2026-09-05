import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Feed } from './src/features/feed/components/Feed';
import { useAnonymousUserId } from './src/features/identity/use-anonymous-user-id';

export default function App() {
  // Feed, quiz cevaplarını ve video watch-event'lerini bir userId'ye ihtiyaç
  // duyacak şekilde gönderiyor (bkz. Chunk 6) — bu yüzden feed'i, anonymous
  // identity hazır olmadan hiç mount etmiyoruz (identity.status === 'success'
  // DIŞINDA hiçbir dalda <Feed> render edilmiyor). Bu kontrol tek kullanım yeri
  // olan, trivial bir discriminant — ayrı bir fonksiyona çıkarmak sadece test
  // uğruna gereksiz bir production abstraction olurdu (bkz. Chunk 7 review).
  const identity = useAnonymousUserId();

  return (
    <>
      {identity.status === 'loading' && (
        <View style={styles.centered}>
          <Text style={styles.message}>Yükleniyor…</Text>
        </View>
      )}
      {identity.status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.message}>Başlatılamadı: {identity.message}</Text>
        </View>
      )}
      {identity.status === 'success' && <Feed userId={identity.userId} />}
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
  },
});
