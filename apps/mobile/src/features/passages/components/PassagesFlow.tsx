import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Passage, PassageLevel } from "@linguascroll/shared-types";
import type { AccountLinkControl } from "../../identity/auth-state";
import { PaywallFeedItem } from "../../subscription/PaywallFeedItem";
import { VocabularyWordSheet } from "../../subtitles/VocabularyWordSheet";
import type { PassageWordSheetEntry } from "../passage-word-entry";
import { effectiveSelection, findOpenPassage, findWordSaved, flattenPassagePages } from "../passages-state";
import type { PassagesDeps } from "../passages-controller";
import { usePassages } from "../use-passages";
import { PassageEndPage } from "./PassageEndPage";
import { PassageLockedPage } from "./PassageLockedPage";
import { PassagePager } from "./PassagePager";
import { PassageQuestionPage } from "./PassageQuestionPage";
import { PassageTextPage } from "./PassageTextPage";
import { ShowTextSheet } from "./ShowTextSheet";

type OpenPassage = Extract<Passage, { access: "open" }>;

export const PASSAGE_LEVELS: readonly PassageLevel[] = ["B1", "B2", "C1", "C2"];

type PassagesFlowProps = {
  userId: string;
  account: AccountLinkControl;
  /** Onboarding'deki seviye B1..C2 ise başlangıç seviyesi; değilse B1. Seviye otomatik yükseltilmez. */
  initialLevel?: PassageLevel;
  onBack: () => void;
  /** Test için enjekte edilebilir bağımlılıklar (gerçek ağ yerine). */
  deps?: PassagesDeps;
};

/**
 * Okuma / Paragraf Pratiği ekranı. Mevcut navigasyon deseni (App.tsx'teki `mode` anahtarı) korunur; ayrı navigasyon kütüphanesi YOK.
 * Veri/zamanlama mantığı usePassages → PassagesController'da (yarış, erişim yenileme, belirsiz cevap, kelime kaydı); burası
 * yalnız çizer ve kullanıcı eylemlerini o hook'a bağlar. Kelime penceresi video akışıyla ORTAK VocabularyWordSheet'tir.
 */
export function PassagesFlow({ userId, account, initialLevel, onBack, deps }: PassagesFlowProps) {
  const insets = useSafeAreaInsets();
  const [level, setLevel] = useState<PassageLevel>(initialLevel ?? "B1");
  const passages = usePassages(userId, level, deps);
  const [viewport, setViewport] = useState({ height: 0, width: 0 });
  // Henüz GÖNDERİLMEMİŞ şık seçimi (soru id → şık id): yerel, geçici.
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [entry, setEntry] = useState<PassageWordSheetEntry | null>(null);
  const [textSheetPassage, setTextSheetPassage] = useState<OpenPassage | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Erişim değişince liste sıfırlanır: açık pencereler (kelime/metin) silinen içeriğe bağlı kalmasın.
  const status = passages.state.status;
  useEffect(() => {
    if (status !== "success") {
      setEntry(null);
      setTextSheetPassage(null);
    }
  }, [status]);
  useEffect(() => {
    setSelected({});
  }, [level]);

  const entrySaved = entry ? findWordSaved(passages.state, entry.wordId) : false;
  const entryPending = entry ? passages.pendingWords.has(entry.wordId) : false;
  const entryError = entry ? passages.wordErrors[entry.wordId] ?? null : null;

  function renderBody() {
    if (viewport.height <= 0 || viewport.width <= 0) return null;
    const { state } = passages;
    if (state.status === "loading") {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>{passages.accessChanged ? "Erişimin güncelleniyor…" : "Metinler yükleniyor…"}</Text>
        </View>
      );
    }
    if (state.status === "error") {
      return (
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={styles.message}>{state.message}</Text>
          <Pressable accessibilityRole="button" onPress={passages.refresh} style={styles.retry}>
            <Text style={styles.retryText}>Tekrar dene</Text>
          </Pressable>
        </View>
      );
    }
    if (state.items.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>Bu seviyede henüz metin yok.</Text>
        </View>
      );
    }

    const pages = flattenPassagePages(state.items);
    const { height, width } = viewport;
    return (
      <PassagePager
        key={`${userId}:${level}`}
        pages={pages}
        height={height}
        width={width}
        // Devam sayfası hata verdiyse OTOMATİK yeniden istek yok: her sayfa çevirişinde yeni istek atmak yerine kullanıcı bitiş
        // sayfasındaki "Tekrar dene" ile yeniden dener (feed ile aynı karar).
        onNearEnd={() => {
          if (state.loadMoreError === null) passages.loadMore();
        }}
        renderEnd={() => <PassageEndPage height={height} width={width} loadMoreError={state.loadMoreError} hasMore={state.nextCursor !== null} onRetry={passages.loadMore} />}
        renderPage={({ passage, page }, goNext) => {
          if (passage.access === "locked" || page.kind === "locked") {
            return <PassageLockedPage title={passage.title} level={passage.level} topic={passage.topic} height={height} width={width} onUnlock={() => setPaywallOpen(true)} onNext={goNext} />;
          }
          if (page.kind === "text") {
            return <PassageTextPage passage={passage} height={height} width={width} onPressWord={(next) => {
              passages.clearWordError(next.wordId);
              setEntry(next);
            }} onNext={goNext} />;
          }
          const question = passage.questions.find((candidate) => candidate.id === page.questionId);
          if (!question) return <View style={{ height, width }} />;
          const selectedOptionId = effectiveSelection(selected[question.id], passages.eliminated);
          return (
            <PassageQuestionPage
              question={question}
              questions={passage.questions}
              index={page.index}
              total={page.total}
              height={height}
              width={width}
              selectedOptionId={selectedOptionId}
              eliminated={passages.eliminated}
              pendingOptionId={passages.pendingAnswers[question.id]}
              error={passages.answerErrors[question.id]}
              onSelect={(optionId) => setSelected((current) => ({ ...current, [question.id]: optionId }))}
              onToggleElimination={(optionId) => passages.toggleElimination(question.id, optionId)}
              onCheck={() => {
                if (selectedOptionId !== null) void passages.answer(question.id, selectedOptionId);
              }}
              onRecheck={() => void passages.recheckAnswer(question.id)}
              onShowText={() => setTextSheetPassage(passage)}
              onNext={goNext}
            />
          );
        }}
      />
    );
  }

  const stillOpenTextPassage = textSheetPassage ? findOpenPassage(passages.state, textSheetPassage.id) : null;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>‹ Keşfet</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>Okuma</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.levels}>
          {PASSAGE_LEVELS.map((candidate) => (
            <Pressable
              key={candidate}
              accessibilityRole="button"
              accessibilityLabel={`${candidate} seviyesi`}
              accessibilityState={{ selected: candidate === level }}
              onPress={() => setLevel(candidate)}
              style={[styles.level, candidate === level && styles.levelActive]}
            >
              <Text style={[styles.levelText, candidate === level && styles.levelTextActive]}>{candidate}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        testID="passages-body"
        style={styles.body}
        onLayout={({ nativeEvent: { layout } }) => setViewport({ height: layout.height, width: layout.width })}
      >
        {renderBody()}
      </View>

      <VocabularyWordSheet
        entry={entry ? { title: entry.displayText, gloss: entry.gloss } : null}
        sentence={entry?.sentence}
        closeLabel="Metne dön"
        onClose={() => setEntry(null)}
        isSaved={entrySaved}
        isPending={entryPending}
        error={entryError}
        // İki AYRI niyet; yalnız kelimenin gerçek durumu uyuşuyorsa uygulanır (bkz. VocabularyWordSheet).
        onSave={() => {
          if (entry && !entrySaved) void passages.saveWord(entry.passageId, entry.wordId, entry.spanId);
        }}
        onRemove={() => {
          if (entry && entrySaved) void passages.unsaveWord(entry.wordId);
        }}
      />

      <ShowTextSheet passage={stillOpenTextPassage} onClose={() => setTextSheetPassage(null)} />

      <Modal visible={paywallOpen} animationType="slide" onRequestClose={() => setPaywallOpen(false)}>
        <View style={[styles.paywallRoot, { paddingTop: insets.top + 12 }]}>
          <Pressable accessibilityRole="button" onPress={() => setPaywallOpen(false)} style={styles.paywallClose}>
            <Text style={styles.backText}>‹ Metinlere dön</Text>
          </Pressable>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <PaywallFeedItem
              scrollable
              height={Math.max(0, viewport.height)}
              width={viewport.width}
              userId={userId}
              account={account}
              reason="upgrade"
              // Abonelik backend'de doğrulanınca use-paywall erişim olayını yayınlar; usePassages listeyi sunucudan yeniden çeker.
              onUnlocked={() => setPaywallOpen(false)}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: { paddingHorizontal: 18, paddingBottom: 10, backgroundColor: "#111116", gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { minHeight: 44, justifyContent: "center" },
  backText: { color: "#ddf9a8", fontSize: 15, fontWeight: "700" },
  title: { color: "#f5f4f9", fontSize: 20, fontWeight: "800" },
  headerSpacer: { width: 64 },
  levels: { flexDirection: "row", gap: 8 },
  level: { flex: 1, minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: "#3a3750", alignItems: "center", justifyContent: "center" },
  levelActive: { backgroundColor: "#ddf9a8", borderColor: "#ddf9a8" },
  levelText: { color: "#c8c5d8", fontSize: 15, fontWeight: "700" },
  levelTextActive: { color: "#11140a" },
  body: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 14 },
  message: { color: "#fff", textAlign: "center", fontSize: 15 },
  retry: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: "#fff", borderRadius: 10, paddingHorizontal: 18 },
  retryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  endText: { color: "#aba8b9", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 40 },
  paywallRoot: { flex: 1, backgroundColor: "#000", paddingHorizontal: 12 },
  paywallClose: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
});
