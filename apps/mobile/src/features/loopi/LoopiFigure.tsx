import { Animated, StyleSheet, Text, View } from "react-native";

/**
 * 2026-11-17 — Loopi'nin çizimi. Onaylı taslaktaki (claude.ai Loopi Kart Taslağı) SVG'nin View karşılığı:
 * react-native-svg / Lottie / Rive EKLENMEDİ (yeni native bağımlılık = yeni build riski, kapalı test sürerken
 * istenmedi). Ölçüler taslakla aynı: kafa 44, boncuk 26 (aralık 27), kuyruk 16. Son çizim illüstratör işi;
 * bu dosya oranları ve dört ifadeyi taşıyan sade sürüm.
 *
 * Hareket SADECE transform/opacity ve dışarıdan verilen Animated.Value'lar ile (useNativeDriver uyumlu) —
 * boyut/konum (layout) animasyonu yok. Dekoratif: ekran okuyucudan gizli, dokunmayı asla yakalamaz; bilgi
 * kartın metninde.
 */
export const LOOPI_COLORS = {
  lavender: "#b9a6ff",
  lavenderHighlight: "#d6caff",
  cream: "#fff3dc",
  outline: "#35246f",
  lime: "#d4f56b",
  limeInk: "#1d2a00",
  ghost: "#5b6bd0",
  muted: "#9aa3cc",
} as const;

export type LoopiFace = "sleepy" | "curious" | "eating" | "happy";

export type LoopiPill = {
  lemma: string;
  extraCount: number;
  /** 0 → 1: hap ağza kayar, küçülür ve kaybolur (yutma). */
  progress: Animated.Value;
};

type LoopiFigureProps = {
  /** Gövde boncuğu = geçilen eşik sayısı (0..7). */
  beads: number;
  face: LoopiFace;
  /** Bu konumdan itibaren (kafaya en yakın yeni boncuklar) `popScale` ile belirir. */
  popFrom?: number;
  popScale?: Animated.Value;
  pill?: LoopiPill | null;
  /** 0 kelime: ilk kelimenin yeri olarak kesik çizgili boş hap. */
  ghost?: boolean;
};

export function LoopiFigure({ beads, face, popFrom = beads, popScale, pill, ghost }: LoopiFigureProps) {
  return (
    <View style={styles.row} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="loopi-figure">
      <View style={styles.tail} />
      {Array.from({ length: beads }, (_, position) => {
        // distance 1 = kafaya en yakın boncuk; taslaktaki hafif dalga aynı formülle.
        const translateY = 5 * Math.sin((beads - position) * 1.1);
        const isPopping = popScale !== undefined && position >= popFrom;
        return (
          <Animated.View
            key={position}
            testID="loopi-bead"
            style={[styles.bead, { transform: isPopping ? [{ translateY }, { scale: popScale }] : [{ translateY }] }]}
          >
            <View style={styles.beadShine} />
          </Animated.View>
        );
      })}
      <LoopiHead face={face} />
      {ghost && <View style={styles.ghostPill} testID="loopi-ghost-pill" />}
      {pill && (
        <Animated.View
          testID="loopi-pill"
          style={[
            styles.pill,
            {
              opacity: pill.progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.6, 0] }),
              transform: [
                { translateX: pill.progress.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) },
                { scale: pill.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] }) },
              ],
            },
          ]}
        >
          <Text style={styles.pillText} numberOfLines={1}>
            {pill.lemma}
          </Text>
          {pill.extraCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>+{pill.extraCount}</Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function LoopiHead({ face }: { face: LoopiFace }) {
  return (
    <View style={styles.head} testID={`loopi-face-${face}`}>
      <View style={styles.headShine} />
      <View style={styles.belly} />
      <Eye face={face} left={18.5} />
      <Eye face={face} left={31.5} />
      <Mouth face={face} />
      {face === "sleepy" && (
        <>
          <Text style={[styles.z, { right: -12, top: -10 }]}>z</Text>
          <Text style={[styles.z, { right: -20, top: -19, fontSize: 9 }]}>z</Text>
        </>
      )}
    </View>
  );
}

const EYE_CENTER_Y = 14.5;

function Eye({ face, left }: { face: LoopiFace; left: number }) {
  if (face === "sleepy") return <View style={[styles.arcDown, { left: left - 4.5, top: EYE_CENTER_Y - 1, width: 9, height: 5 }]} />;
  if (face === "happy") return <View style={[styles.arcUp, { left: left - 4.5, top: EYE_CENTER_Y - 3, width: 9, height: 5 }]} />;
  return (
    <View style={[styles.eye, { left: left - 3.3, top: EYE_CENTER_Y - 4.6 }]}>
      <View style={styles.eyeGlint} />
    </View>
  );
}

function Mouth({ face }: { face: LoopiFace }) {
  if (face === "eating") return <View style={styles.mouthOpen} />;
  if (face === "sleepy") return <View style={styles.mouthFlat} />;
  if (face === "happy") return <View style={[styles.arcDown, { left: 20.5, top: 25, width: 12, height: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} />;
  return <View style={[styles.arcDown, { left: 22.5, top: 26, width: 8, height: 4 }]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  tail: { width: 16, height: 16, borderRadius: 8, backgroundColor: LOOPI_COLORS.lavender, borderWidth: 2.5, borderColor: LOOPI_COLORS.outline, marginTop: 20 },
  bead: { width: 26, height: 26, borderRadius: 13, backgroundColor: LOOPI_COLORS.lavender, borderWidth: 2.5, borderColor: LOOPI_COLORS.outline, marginLeft: 1, marginTop: 12 },
  beadShine: { position: "absolute", left: 4, top: 2.5, width: 6.4, height: 6.4, borderRadius: 3.2, backgroundColor: LOOPI_COLORS.lavenderHighlight, opacity: 0.7 },
  head: { width: 44, height: 44, borderRadius: 22, backgroundColor: LOOPI_COLORS.lavender, borderWidth: 2.5, borderColor: LOOPI_COLORS.outline, marginLeft: 2 },
  headShine: { position: "absolute", left: 7, top: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: LOOPI_COLORS.lavenderHighlight, opacity: 0.7 },
  belly: { position: "absolute", left: 11, top: 18, width: 27, height: 19, borderRadius: 13.5, backgroundColor: LOOPI_COLORS.cream },
  eye: { position: "absolute", width: 6.6, height: 9.2, borderRadius: 3.3, backgroundColor: LOOPI_COLORS.outline },
  eyeGlint: { position: "absolute", left: 3.3, top: 1.8, width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: "#fff" },
  arcDown: { position: "absolute", borderColor: LOOPI_COLORS.outline, borderWidth: 2.4, borderTopWidth: 0, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  arcUp: { position: "absolute", borderColor: LOOPI_COLORS.outline, borderWidth: 2.4, borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  mouthOpen: { position: "absolute", left: 26, top: 21, width: 11, height: 13, borderRadius: 6, backgroundColor: LOOPI_COLORS.outline },
  mouthFlat: { position: "absolute", left: 23.5, top: 27, width: 6, height: 2.6, borderRadius: 1.3, backgroundColor: LOOPI_COLORS.outline },
  z: { position: "absolute", color: LOOPI_COLORS.muted, fontSize: 12, fontWeight: "800" },
  ghostPill: { width: 62, height: 26, borderRadius: 13, borderWidth: 2, borderStyle: "dashed", borderColor: LOOPI_COLORS.ghost, marginLeft: 10, marginTop: -12 },
  pill: { minWidth: 46, height: 26, borderRadius: 13, backgroundColor: LOOPI_COLORS.lime, paddingHorizontal: 11, justifyContent: "center", marginLeft: 10, marginTop: -12, maxWidth: 140 },
  pillText: { color: LOOPI_COLORS.limeInk, fontSize: 13, fontWeight: "800", textAlign: "center" },
  badge: { position: "absolute", right: -10, top: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: LOOPI_COLORS.outline, borderWidth: 2, borderColor: LOOPI_COLORS.lime, alignItems: "center", justifyContent: "center" },
  badgeText: { color: LOOPI_COLORS.lime, fontSize: 10, fontWeight: "800" },
});
