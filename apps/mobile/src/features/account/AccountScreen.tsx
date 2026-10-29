import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountLinkControl } from "../identity/auth-state";
import { useAccountSubscription } from "./use-account-subscription";

type Props = { userId: string; account: AccountLinkControl; onBack: () => void; onSignOut: () => void };

/** Hesap işlemleri öğrenme ekranından ayrılır; çıkış ve mağaza yönetimi bilinçli eylemlerdir. */
export function AccountScreen({ userId, account, onBack, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const subscription = useAccountSubscription(userId, account.isAnonymous);
  const busy = subscription.action !== "idle" || account.linking;
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => { onBack(); return true; });
    return () => handler.remove();
  }, [onBack]);

  function confirmSignOut() {
    Alert.alert("Çıkış yapılsın mı?", "Kelimelerine ve hesabına yeniden giriş yaparak ulaşabilirsin. Çıkış yapmak aboneliğini iptal etmez.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: onSignOut },
    ]);
  }

  const plan = subscription.status === "active" ? "Premium" : subscription.status === "inactive" ? "Ücretsiz erişim" : "Abonelik durumu";
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Kelimelerime dön" style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Hesabım</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{account.isAnonymous ? "L" : "G"}</Text></View>
          <Text style={styles.profileTitle}>{account.isAnonymous ? "Hoş geldin" : "Google hesabın bağlı"}</Text>
          <Text style={styles.secondary}>{account.isAnonymous ? "Öğrenme yolculuğun burada başlıyor." : "Kelimelerin ve ilerlemen bu hesapta."}</Text>
          <View style={styles.identityBadge}><Text style={styles.identityText}>{account.isAnonymous ? "Misafir hesabı" : "Google ile giriş yapıldı"}</Text></View>
        </View>

        {account.isAnonymous && (
          <View style={styles.linkCard}>
            <Text style={styles.cardTitle}>Kelimelerin seninle gelsin</Text>
            <Text style={styles.body}>Google hesabını bağla; kelimelerine ve ilerlemene başka cihazlardan da ulaş.</Text>
            <Pressable onPress={account.onLinkAccount} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy, busy: account.linking }} style={[styles.primary, busy && styles.disabled]}>
              {account.linking ? <ActivityIndicator color="#171321" /> : <Text style={styles.primaryText}>Google ile devam et</Text>}
            </Pressable>
            <Text style={styles.caption}>Hesap bağlamak abonelik başlatmaz.</Text>
          </View>
        )}
        {account.notice !== null && <Text accessibilityRole="alert" style={styles.notice}>{account.notice}</Text>}

        <Text style={styles.sectionLabel}>ÜYELİK</Text>
        <View style={styles.planCard}>
          <View style={styles.planHeading}>
            <Text style={styles.wordmark}>Looplish</Text>
            <View style={[styles.planBadge, subscription.status === "active" && styles.premiumBadge]}><Text style={styles.planBadgeText}>{plan}</Text></View>
          </View>
          {subscription.status === "loading" ? (
            <View style={styles.loading}><ActivityIndicator color="#bca7ff" /><Text style={styles.body}>Aboneliğin kontrol ediliyor…</Text></View>
          ) : (
            <Text style={styles.body}>{subscription.status === "active" ? "Sınırsız video ve quiz ile öğrenmeye devam et." : subscription.status === "unknown" ? "Abonelik bilgine şu an ulaşılamıyor. Durumunu yeniden kontrol edebilirsin." : "İlk 10 farklı video ücretsiz. Premium ile sınırsız öğren."}</Text>
          )}
        </View>

        {!account.isAnonymous && (
          <View style={styles.group}>
            <AccountRow title="Aboneliği yönet" detail="Plan, yenileme ve iptal işlemleri Google Play'de." onPress={subscription.manage} disabled={busy} busy={subscription.action === "managing"} />
            <AccountRow title="Satın alımları geri yükle" detail="Daha önce aldığın aboneliği kontrol et." onPress={subscription.restore} disabled={busy} busy={subscription.action === "restoring"} />
            <AccountRow title="Abonelik durumunu yenile" detail="Son ödeme veya plan değişikliğini kontrol et." onPress={subscription.refresh} disabled={busy} busy={subscription.action === "refreshing"} last />
          </View>
        )}
        {subscription.notice !== null && <Text accessibilityRole="alert" style={styles.notice}>{subscription.notice}</Text>}
        {!account.isAnonymous && (
          <>
            <Text style={styles.sectionLabel}>OTURUM</Text>
            <View style={styles.group}><AccountRow title="Çıkış yap" detail="Aboneliğin ve hesabın korunur." onPress={confirmSignOut} disabled={busy} last /></View>
          </>
        )}
        <Text style={styles.footer}>Her gün biraz, zamanla çok şey.</Text>
      </ScrollView>
    </View>
  );
}

function AccountRow({ title, detail, onPress, disabled, busy = false, last = false }: { title: string; detail: string; onPress: () => void; disabled: boolean; busy?: boolean; last?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled, busy }} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed, disabled && styles.disabled]}>
    <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View>
    {busy ? <ActivityIndicator color="#bca7ff" /> : <Text style={styles.chevron}>›</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#100e16" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, minHeight: 60 },
  back: { width: 48, minHeight: 48, justifyContent: "center" },
  backText: { color: "#eeeaf8", fontSize: 34 },
  headerTitle: { flex: 1, textAlign: "center", color: "#f5f4f9", fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 48 },
  content: { paddingHorizontal: 20, gap: 16, width: "100%", maxWidth: 560, alignSelf: "center" },
  profile: { alignItems: "center", paddingVertical: 20, gap: 10 },
  avatar: { width: 68, height: 68, borderRadius: 24, backgroundColor: "#2d2342", borderWidth: 1, borderColor: "#53406e", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#d4c5ff", fontSize: 28, fontWeight: "700" },
  profileTitle: { color: "#f5f4f9", fontSize: 23, fontWeight: "700", textAlign: "center" },
  secondary: { color: "#aaa2ba", fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 300 },
  identityBadge: { borderRadius: 20, backgroundColor: "#211b2d", paddingVertical: 6, paddingHorizontal: 12 },
  identityText: { color: "#c4b6df", fontSize: 12, fontWeight: "600" },
  linkCard: { backgroundColor: "#211a30", borderRadius: 22, borderWidth: 1, borderColor: "#403052", padding: 20, gap: 12 },
  cardTitle: { color: "#f5f4f9", fontSize: 20, fontWeight: "700" },
  body: { color: "#b9b1c8", fontSize: 14, lineHeight: 22, flexShrink: 1 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: "#c8b5ff", alignItems: "center", justifyContent: "center", padding: 12 },
  primaryText: { color: "#171321", fontSize: 16, fontWeight: "700" },
  caption: { color: "#b9b1c8", fontSize: 12, textAlign: "center", lineHeight: 18 },
  sectionLabel: { color: "#a49ab5", fontSize: 11, fontWeight: "700", letterSpacing: 1.8, marginTop: 8, marginLeft: 4 },
  planCard: { padding: 20, borderRadius: 20, backgroundColor: "#1b1724", borderWidth: 1, borderColor: "#352c44", gap: 14 },
  planHeading: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" },
  wordmark: { color: "#f5f4f9", fontSize: 22, fontWeight: "800" },
  planBadge: { backgroundColor: "#32283f", borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9 },
  premiumBadge: { backgroundColor: "#443263" },
  planBadgeText: { color: "#dfd3ff", fontSize: 12, fontWeight: "600" },
  loading: { flexDirection: "row", alignItems: "center", gap: 10 },
  group: { backgroundColor: "#1b1724", borderWidth: 1, borderColor: "#30283b", borderRadius: 20, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 17, gap: 12, minHeight: 76 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#362d43" },
  rowCopy: { flex: 1, gap: 5 },
  rowTitle: { color: "#eeeaf5", fontSize: 15, fontWeight: "600" },
  rowDetail: { color: "#aaa1ba", fontSize: 12, lineHeight: 18 },
  chevron: { color: "#a89abf", fontSize: 25 },
  pressed: { backgroundColor: "#2a2237" },
  disabled: { opacity: 0.55 },
  notice: { color: "#d7c8ed", backgroundColor: "#292136", borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 20 },
  footer: { textAlign: "center", color: "#8e839f", fontSize: 12, marginVertical: 12 },
});
