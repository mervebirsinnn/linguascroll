import { APP_LINKS, openAppLink } from "../../shared/app-links";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { AccountLinkControl } from "../identity/auth-state";
import { ctaLabel, finePrint, type PaywallPackage } from "./paywall-model";
import { usePaywall } from "./use-paywall";

const brandMarkImage = require("../../../assets/brand-mark.png") as number;

type PaywallFeedItemProps = {
  height: number;
  width: number;
  userId: string;
  account: AccountLinkControl;
  /** Abonelik BACKEND'de doğrulandığında çağrılır — parent feed'i yeniler (bkz. use-paywall.ts). */
  onUnlocked: () => void;
  reason?: "quota" | "upgrade";
  scrollable?: boolean;
};

/**
 * Backend'in ücretsiz hakkı (hesap başına toplam 10 video) dolunca döndürdüğü TERMİNAL feed item'ı (bkz.
 * feed.service.ts, `{type:"paywall"}`, nextCursor null). Dikey ScrollView BİLİNÇLİ olarak yok:
 * FlatList'in dikey sayfa kaydırmasıyla aynı eksende çakışır (vocabulary listesinde yaşanan
 * "kaydırınca sonraki videoya geçiyor" sorunu) — içerik tek ekrana sığacak kadar kompakt.
 *
 * 2026-10-28 — misafir (anonim) kullanıcı: paketler ve fiyat/deneme metni AYNEN görünür (fiyat
 * girişten ÖNCE belli olmalı), ama ana buton önce "Google ile devam et" — abonelik bir hesaba
 * bağlanmadan satın alınmaz (başka cihazda/yeniden kurulumda geri yüklenebilsin). Bağlama sonrası
 * Firebase UID aynı kaldığı için RevenueCat kimliği de aynı; buton satın almaya döner.
 * "Satın alımları geri yükle" misafirde gizli: geri yükleme hesaba bağlıdır.
 */
export function PaywallFeedItem(props: PaywallFeedItemProps) {
  const controller = usePaywall(props.userId, props.onUnlocked, !props.account.isAnonymous);
  return <PaywallContent {...props} controller={controller} />;
}

/** Tam koşullar ve feed görünümü aynı satın alma durumunu paylaşır; ikinci işlem açılmaz. */
function PaywallContent({ height, width, userId, account, onUnlocked, reason = "quota", scrollable = false, controller }: PaywallFeedItemProps & { controller: ReturnType<typeof usePaywall> }) {
  const { state, select, purchaseSelected, restore, retryVerification, reloadOfferings } = controller;
  const [expanded, setExpanded] = useState(false);
  const viewport = useWindowDimensions();
  const needsAccount = account.isAnonymous;
  const compact = height < 740;

  return (
    <>
    <View style={[styles.root, compact && !scrollable && styles.rootCompact, scrollable ? { minHeight: height, width } : { height, width }]}>
      <View style={styles.brandRow}>
        <Image source={brandMarkImage} style={styles.brand} accessibilityLabel="Looplish" />
        <Text style={styles.wordmark}>Looplish <Text style={styles.premiumLabel}>PREMIUM</Text></Text>
      </View>
      <Text accessibilityRole="header" style={[styles.title, compact && !scrollable && styles.titleCompact]}>Biraz merak.
Sınırsız öğrenme.</Text>
      <Text style={styles.subtitle}>{reason === "quota" ? "10 ücretsiz videonu izledin. Devam etmek için abone ol." : "Tüm videolar ve quiz’lerle öğrenmeye devam et."}</Text>

      {!scrollable && <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Text style={styles.restoreText}>Planlar ve tüm koşullar</Text></Pressable>}
      {state.status === "loading" && <View style={styles.loading}><ActivityIndicator color="#bca7ff" /><Text style={styles.muted}>Yükleniyor…</Text></View>}

      {state.status === "unavailable" && <View style={styles.loading}>
        <Text accessibilityRole="alert" style={styles.muted}>{state.message}</Text>
        <Pressable onPress={reloadOfferings} accessibilityRole="button" style={styles.restore}><Text style={styles.restoreText}>Seçenekleri yeniden yükle</Text></Pressable>
      </View>}

      {state.status === "ready" && (
        <>
          <View style={styles.benefits}>
            <Text style={styles.benefit}>✓  Sınırsız video ve quiz</Text>
            <Text style={styles.benefit}>✓  Tüm seviyeler ve konular açık</Text>
          </View>

          <Text style={styles.sectionLabel}>SANA UYGUN PLANI SEÇ</Text>
          <View style={[styles.packages, compact && styles.packagesCompact]}>
            {state.packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} compact={compact && !scrollable} selected={pkg.id === state.selectedId} disabled={state.action !== "idle" || state.verificationPending} onPress={() => select(pkg.id)} />
            ))}
          </View>

          {needsAccount ? (
            <Pressable
              onPress={account.onLinkAccount}
              disabled={account.linking}
              accessibilityRole="button"
              style={[styles.cta, compact && styles.ctaCompact, account.linking && styles.ctaDisabled]}
            >
              {account.linking ? <ActivityIndicator color="#14111d" /> : <Text style={styles.ctaText}>Google ile devam et</Text>}
            </Pressable>
          ) : (
            <Pressable
              onPress={state.verificationPending ? retryVerification : purchaseSelected}
              disabled={state.action !== "idle"}
              accessibilityRole="button"
              style={[styles.cta, compact && styles.ctaCompact, state.action !== "idle" && styles.ctaDisabled]}
            >
              <Text style={styles.ctaText}>{state.action === "purchasing" ? "Google Play açılıyor…" : state.action === "verifying" ? "Aboneliğin doğrulanıyor…" : state.verificationPending ? "Aboneliği doğrula" : ctaLabel(selectedOf(state.packages, state.selectedId))}</Text>
            </Pressable>
          )}

          {needsAccount && <Text style={[styles.finePrint, compact && !scrollable && styles.finePrintCompact]}>Önce hesabını bağla, sonra seçtiğin planla devam et. Giriş yapmak ödeme başlatmaz.</Text>}

          <Text style={[styles.finePrint, compact && !scrollable && styles.finePrintCompact]}>{finePrint(selectedOf(state.packages, state.selectedId))}</Text>

          {!needsAccount && (
            <Pressable onPress={restore} disabled={state.action !== "idle" || state.verificationPending} accessibilityRole="button" style={styles.restore}>
              <Text style={styles.restoreText}>{state.action === "restoring" ? "…" : "Satın alımları geri yükle"}</Text>
            </Pressable>
          )}

          {state.action === "verifying" && <Text style={styles.muted}>Aboneliğin doğrulanıyor…</Text>}

          {account.notice !== null && <Text style={styles.notice}>{account.notice}</Text>}

          {state.notice !== null && <Text style={styles.notice}>{state.notice}</Text>}

          {(APP_LINKS.privacy || APP_LINKS.terms) && <View style={{ flexDirection: "row", gap: 16 }}>
            {APP_LINKS.privacy && <Pressable accessibilityRole="link" onPress={() => { void openAppLink(APP_LINKS.privacy!); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={styles.finePrint}>Gizlilik</Text></Pressable>}
            {APP_LINKS.terms && <Pressable accessibilityRole="link" onPress={() => { void openAppLink(APP_LINKS.terms!); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={styles.finePrint}>Koşullar</Text></Pressable>}
          </View>}
          {state.verificationPending && state.action === "idle" && (
            <Pressable onPress={retryVerification} accessibilityRole="button" style={styles.restore}>
              <Text style={styles.restoreText}>Tekrar dene</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
    {!scrollable && <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#100e16" }}>
        <Pressable onPress={() => setExpanded(false)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 24 }}><Text style={styles.restoreText}>Kapat</Text></Pressable>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <PaywallContent controller={controller} userId={userId} account={account} onUnlocked={onUnlocked} reason={reason} scrollable height={viewport.height - 100} width={viewport.width} />
        </ScrollView>
      </SafeAreaView>
    </Modal>}
    </>
  );
}

function selectedOf(packages: PaywallPackage[], selectedId: string): PaywallPackage {
  // state geçişleri selectedId'nin her zaman packages içinde olmasını garanti ediyor.
  return packages.find((p) => p.id === selectedId) ?? (packages[0] as PaywallPackage);
}

function PackageCard({ pkg, selected, disabled, onPress, compact }: { pkg: PaywallPackage; selected: boolean; disabled: boolean; onPress: () => void; compact: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${pkg.title}, ${pkg.priceString} / ${pkg.periodLabel}${pkg.trialLabel ? `, ${pkg.trialLabel}` : ""}`}
      style={[styles.card, compact && styles.cardCompact, selected && styles.cardSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle}>{pkg.title}</Text>
        {pkg.trialLabel !== null && <Text style={styles.cardTrial}>{pkg.trialLabel}</Text>}
      </View>
      <View style={styles.cardRight}>
        {pkg.savingsPercent !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>%{pkg.savingsPercent} tasarruf</Text>
          </View>
        )}
        <Text style={styles.cardPrice}>
          {pkg.priceString} / {pkg.periodLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#100e16", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 12, gap: 12 },
  rootCompact: { gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  titleCompact: { fontSize: 25, lineHeight: 29 },
  packagesCompact: { gap: 6, marginTop: 0 },
  cardCompact: { paddingVertical: 9, paddingHorizontal: 12 },
  ctaCompact: { paddingVertical: 12, marginTop: 2 },
  finePrintCompact: { fontSize: 10, lineHeight: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  wordmark: { color: "#eeeaf5", fontSize: 19, fontWeight: "700" },
  premiumLabel: { color: "#c8b5ff", fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  loading: { alignSelf: "stretch", padding: 24, borderRadius: 18, backgroundColor: "#1b1724", alignItems: "center", gap: 12 },
  sectionLabel: { alignSelf: "flex-start", color: "#b4a8c6", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginTop: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#6c5e80", alignItems: "center", justifyContent: "center", marginRight: 12 },
  radioSelected: { borderColor: "#c8b5ff" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#c8b5ff" },
  brand: { width: 32, height: 32 },
  title: { color: "#f5f4f9", fontSize: 30, lineHeight: 36, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#a79fbd", fontSize: 14, textAlign: "center" },
  muted: { color: "#a79fbd", fontSize: 14, textAlign: "center", marginTop: 8 },
  benefits: { alignSelf: "stretch", gap: 6, marginTop: 4 },
  benefit: { color: "#e6e2f2", fontSize: 15 },
  packages: { alignSelf: "stretch", gap: 10, marginTop: 6 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#2b2440",
    backgroundColor: "#1d1829",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardSelected: { borderColor: "#bca7ff", backgroundColor: "#262037" },
  cardLeft: { gap: 4, flex: 1, flexShrink: 1 },
  cardRight: { alignItems: "flex-end", gap: 4, flexShrink: 1 },
  cardTitle: { color: "#f5f4f9", fontSize: 17, fontWeight: "700" },
  cardTrial: { color: "#bca7ff", fontSize: 13, fontWeight: "600" },
  cardPrice: { color: "#f5f4f9", fontSize: 15, fontWeight: "600" },
  badge: { backgroundColor: "#bca7ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#14111d", fontSize: 12, fontWeight: "800" },
  cta: { alignSelf: "stretch", backgroundColor: "#c8b5ff", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#14111d", fontSize: 17, fontWeight: "800" },
  finePrint: { color: "#b0a5c2", fontSize: 11, lineHeight: 16, textAlign: "center" },
  restore: { paddingVertical: 6 },
  restoreText: { color: "#bca7ff", fontSize: 14, fontWeight: "600" },
  notice: { color: "#ffb3b3", fontSize: 13, textAlign: "center" },
});
