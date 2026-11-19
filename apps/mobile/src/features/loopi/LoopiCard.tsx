import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { getLoopiStage, getNextLoopiThreshold } from "./loopi-stage";
import type { SavedWordForReveal } from "./loopi-state";
import { LOOPI_COLORS, LoopiFigure, type LoopiFace } from "./LoopiFigure";
import { useLoopiCard } from "./use-loopi-card";
import { useReduceMotion } from "./use-reduce-motion";

/** Taslaktaki süreler: yutma 500 ms + uzama 300 ms = 0,8 sn (hedef ≤ 1,2 sn). */
const SWALLOW_MS = 500;
const POP_UP_MS = 180;
const POP_SETTLE_MS = 120;
const HAPPY_HOLD_MS = 700;

type LoopiCardProps = {
  userId: string;
  /** Sunucudaki GÜNCEL tam liste (GET /words/saved). Sayı ve hapta yazan kelime buradan gelir. */
  savedWords: readonly SavedWordForReveal[];
};

/**
 * 2026-11-17 — Kelimelerim'in üstündeki Loopi kartı. Kural tek cümle: "Kelime topladıkça Loopi büyür."
 * Metin "öğrendin" değil "topladın" (sayı kaydedilen kelimedir, öğrenme iddiası yok — ürün kararı).
 *
 * Açılışta oynatılacak bir şey varsa (bkz. openLoopiCard): en yeni kelimenin lime hapı ağza kayar (+N rozetli),
 * Loopi yutar; eşik geçildiyse ardından TEK uzama (kaç eşik atlanmış olursa olsun doğrudan son boy). Hareketi
 * azalt açıkken aynı sonuç animasyonsuz gösterilir; bilgi her zaman metinde de var.
 */
export function LoopiCard({ userId, savedWords }: LoopiCardProps) {
  const model = useLoopiCard(userId, savedWords);
  const reduceMotion = useReduceMotion();
  const count = savedWords.length;
  const stage = getLoopiStage(count);
  const next = getNextLoopiThreshold(count);
  const restFace: LoopiFace = count === 0 ? "sleepy" : "curious";

  const reveal = model.status === "ready" ? model.reveal : null;
  const decided = model.status === "ready" && reduceMotion !== null;
  const animate = decided && reveal !== null && reduceMotion === false;

  const [face, setFace] = useState<LoopiFace>(restFace);
  const pillProgress = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!decided) return;
    if (!animate || reveal === null) {
      setFace(reveal !== null ? "happy" : restFace);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    setFace(reveal.latest ? "eating" : "happy");
    const steps: Animated.CompositeAnimation[] = [];
    if (reveal.latest) {
      steps.push(Animated.timing(pillProgress, { toValue: 1, duration: SWALLOW_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }));
      timers.push(setTimeout(() => setFace("happy"), SWALLOW_MS));
    }
    steps.push(
      Animated.timing(popScale, { toValue: 1.2, duration: POP_UP_MS, useNativeDriver: true }),
      Animated.timing(popScale, { toValue: 1, duration: POP_SETTLE_MS, useNativeDriver: true }),
    );
    const animation = Animated.sequence(steps);
    animation.start(({ finished }) => {
      if (finished) timers.push(setTimeout(() => setFace(restFace), HAPPY_HOLD_MS));
    });
    return () => {
      animation.stop();
      timers.forEach(clearTimeout);
    };
    // Kart açılışı başına tek gösterim: karar verildiği an bir kez çalışır.
  }, [decided]);

  const latest = reveal?.latest ?? null;
  const firstLemma = savedWords[0]?.word.lemma ?? "";

  return (
    <View style={styles.card}>
      <View style={styles.board}>
        <BoardDots />
        {decided && (
          <LoopiFigure
            beads={stage}
            face={face}
            ghost={count === 0}
            popFrom={animate && reveal ? reveal.fromStage : stage}
            popScale={animate ? popScale : undefined}
            pill={animate && latest ? { lemma: latest.lemma, extraCount: reveal?.extraCount ?? 0, progress: pillProgress } : null}
          />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} accessibilityRole="header">
          {count === 0 ? (
            "Loopi ilk kelimesini bekliyor"
          ) : count === 1 ? (
            <>
              İlk kelimen: <Text style={styles.accent}>{firstLemma}</Text>
            </>
          ) : (
            <>
              <Text style={styles.accent}>{count}</Text> kelime topladın
            </>
          )}
        </Text>
        {count === 0 && <Text style={styles.sub}>Videoda bir kelimeye dokun ve kaydet.</Text>}
        {count > 1 && latest && (
          <Text style={styles.sub}>
            Yeni: {latest.lemma}
            {reveal && reveal.extraCount > 0 ? ` ve ${reveal.extraCount} kelime daha` : ""}
          </Text>
        )}
        {next !== null ? (
          <View style={styles.meter} accessible accessibilityLabel={`Büyüme: ${count} / ${next}. Sonraki büyüme ${next} kelimede.`}>
            <View style={styles.meterRow}>
              <Text style={styles.meterLabel}>Sonraki büyüme: {next} kelime</Text>
              <Text style={styles.meterValue}>
                {count} / {next}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, (count / next) * 100)}%` }]} />
            </View>
          </View>
        ) : (
          <Text style={styles.done}>✓ 100 kelimelik hedef tamamlandı</Text>
        )}
      </View>
    </View>
  );
}

/** Oyun tahtasının soluk nokta ızgarası (taslakta CSS radial-gradient; burada sabit, hareketsiz noktalar). */
function BoardDots() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={[styles.dotRow, { top: 8 + row * 18 }]}>
          {Array.from({ length: 22 }, (_, col) => (
            <View key={col} style={styles.dot} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, backgroundColor: "#0b1550", overflow: "hidden", marginBottom: 6 },
  board: { height: 124, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  dotRow: { position: "absolute", left: 8, right: 0, flexDirection: "row", gap: 15.2 },
  dot: { width: 2.8, height: 2.8, borderRadius: 1.4, backgroundColor: "#2a3a96" },
  info: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 8 },
  title: { color: "#f3f5ff", fontSize: 19, fontWeight: "800" },
  accent: { color: LOOPI_COLORS.lime },
  sub: { color: LOOPI_COLORS.muted, fontSize: 13.5, fontWeight: "600" },
  meter: { gap: 6, marginTop: 2 },
  meterRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  meterLabel: { color: LOOPI_COLORS.muted, fontSize: 12.5, fontWeight: "700", flexShrink: 1 },
  meterValue: { color: "#f3f5ff", fontSize: 12.5, fontWeight: "800", fontVariant: ["tabular-nums"] },
  track: { height: 8, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 99, backgroundColor: LOOPI_COLORS.lime },
  done: { color: LOOPI_COLORS.lime, fontSize: 13, fontWeight: "800" },
});
