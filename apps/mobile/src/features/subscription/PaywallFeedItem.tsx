import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
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
export function PaywallFeedItem({ height, width, userId, account, onUnlocked }: PaywallFeedItemProps) {
  const { state, select, purchaseSelected, restore, retryVerification } = usePaywall(userId, onUnlocked);
  const needsAccount = account.isAnonymous;

  return (
    <View style={[styles.root, { height, width }]}>
      <Image source={brandMarkImage} style={styles.brand} accessibilityLabel="Looplish" />
      <Text style={styles.title}>Öğrenmeye kesintisiz devam et</Text>
      <Text style={styles.subtitle}>10 ücretsiz videonu izledin. Devam etmek için abone ol.</Text>

      {state.status === "loading" && <Text style={styles.muted}>Yükleniyor…</Text>}

      {state.status === "unavailable" && <Text style={styles.muted}>{state.message}</Text>}

      {state.status === "ready" && (
        <>
          <View style={styles.benefits}>
            <Text style={styles.benefit}>✓  Sınırsız video ve quiz</Text>
            <Text style={styles.benefit}>✓  Tüm seviyeler ve konular açık</Text>
          </View>

          <View style={styles.packages}>
            {state.packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} selected={pkg.id === state.selectedId} disabled={state.action !== "idle"} onPress={() => select(pkg.id)} />
            ))}
          </View>

          {needsAccount ? (
            <Pressable
              onPress={account.onLinkAccount}
              disabled={account.linking}
              accessibilityRole="button"
              style={[styles.cta, account.linking && styles.ctaDisabled]}
            >
              {account.linking ? <ActivityIndicator color="#14111d" /> : <Text style={styles.ctaText}>Google ile devam et</Text>}
            </Pressable>
          ) : (
            <Pressable
              onPress={purchaseSelected}
              disabled={state.action !== "idle"}
              accessibilityRole="button"
              style={[styles.cta, state.action !== "idle" && styles.ctaDisabled]}
            >
              <Text style={styles.ctaText}>{state.action === "purchasing" || state.action === "verifying" ? "…" : ctaLabel(selectedOf(state.packages, state.selectedId))}</Text>
            </Pressable>
          )}

          {needsAccount && <Text style={styles.finePrint}>Aboneliğin Google hesabına bağlanır; başka bir cihazda da geçerli olur.</Text>}

          <Text style={styles.finePrint}>{finePrint(selectedOf(state.packages, state.selectedId))}</Text>

          {!needsAccount && (
            <Pressable onPress={restore} disabled={state.action !== "idle"} accessibilityRole="button" style={styles.restore}>
              <Text style={styles.restoreText}>{state.action === "restoring" ? "…" : "Satın alımları geri yükle"}</Text>
            </Pressable>
          )}

          {state.action === "verifying" && <Text style={styles.muted}>Aboneliğin doğrulanıyor…</Text>}

          {account.notice !== null && <Text style={styles.notice}>{account.notice}</Text>}

          {state.notice !== null && <Text style={styles.notice}>{state.notice}</Text>}

          {state.verificationPending && state.action === "idle" && (
            <Pressable onPress={retryVerification} accessibilityRole="button" style={styles.restore}>
              <Text style={styles.restoreText}>Tekrar dene</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function selectedOf(packages: PaywallPackage[], selectedId: string): PaywallPackage {
  // state geçişleri selectedId'nin her zaman packages içinde olmasını garanti ediyor.
  return packages.find((p) => p.id === selectedId) ?? (packages[0] as PaywallPackage);
}

function PackageCard({ pkg, selected, disabled, onPress }: { pkg: PaywallPackage; selected: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.card, selected && styles.cardSelected]}
    >
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
  root: { backgroundColor: "#14111d", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 14 },
  brand: { width: 56, height: 56 },
  title: { color: "#f5f4f9", fontSize: 24, fontWeight: "800", textAlign: "center" },
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
  cardLeft: { gap: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardTitle: { color: "#f5f4f9", fontSize: 17, fontWeight: "700" },
  cardTrial: { color: "#bca7ff", fontSize: 13, fontWeight: "600" },
  cardPrice: { color: "#f5f4f9", fontSize: 15, fontWeight: "600" },
  badge: { backgroundColor: "#bca7ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#14111d", fontSize: 12, fontWeight: "800" },
  cta: { alignSelf: "stretch", backgroundColor: "#bca7ff", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#14111d", fontSize: 17, fontWeight: "800" },
  finePrint: { color: "#8f87a6", fontSize: 12, textAlign: "center" },
  restore: { paddingVertical: 6 },
  restoreText: { color: "#bca7ff", fontSize: 14, fontWeight: "600" },
  notice: { color: "#ffb3b3", fontSize: 13, textAlign: "center" },
});
