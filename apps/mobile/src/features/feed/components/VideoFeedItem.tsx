import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import type {
  FeedPlayableVideo,
  TranscriptSegment,
  VideoVocabularyItem,
} from "@linguascroll/shared-types";
import { recordVideoWatchEvent } from "../api/record-video-watch-event";
import { ExplanationSheet } from "../../subtitles/ExplanationSheet";
import { SubtitleOverlay } from "../../subtitles/SubtitleOverlay";
import { useActiveSubtitle } from "../../subtitles/use-active-subtitle";
import { VocabularyWordSheet } from "../../subtitles/VocabularyWordSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoAttributionSheet } from "./VideoAttributionSheet";

/** timeUpdate event'inin native aralığı (saniye) — okunabilirlik için yeterli, gereksiz re-render yaratmayacak kadar seyrek. */
const SUBTITLE_TIME_UPDATE_INTERVAL_SECONDS = 0.25;

// Alt kontrol ve altyazı aynı normal-flow dock içinde; tahmini yükseklikler birikmez.
// 2026-09-30 — 0.34'te bir sonraki kart ortadan kesiliyordu ve scroll göstergesi
// kapalı olduğu için bu bug gibi görünüyordu (gerçek kullanıcı raporu). 0.40'a
// çıkarmak + görünür scroll bar (aşağıdaki ScrollView) ikisini birden çözüyor:
// hem daha fazla kart sığıyor hem de kaydırılabilir olduğu açıkça görünüyor.
const VOCABULARY_PANEL_HEIGHT_RATIO = 0.4;

type VideoFeedItemProps = {
  // Chunk 9 review düzeltmesi: base PlayableVideo DEĞİL — bir feed item'daki
  // video her zaman FeedService'in enrichment'ından geçmiş (vocabulary dahil).
  video: FeedPlayableVideo;
  /** true ise bu video ekranda aktif/görünür olan videodur ve oynatılmalıdır. */
  isActive: boolean;
  /** Item boyutu — tek ölçüm kaynağı olarak Feed'den gelir (bkz. Feed.tsx). */
  height: number;
  width: number;
  userId: string;
  /**
   * Chunk 9 — vocabulary chip'lerinin saved/pending durumu. Bu component KENDİ
   * local state'ini tutmuyor: aynı wordId birden fazla videoda görünebildiği
   * için (video_words many-to-many) tek mantıksal gerçek Feed.tsx seviyesindeki
   * useSavedWordIds'te yaşıyor, buraya salt okunur fonksiyonlar olarak akıyor.
   */
  isWordSaved: (wordId: string) => boolean;
  isWordPending: (wordId: string) => boolean;
  /** Chunk 16 — sourceSegmentId opsiyonel: word-tap akışı geçirir, panel-chip akışı geçirmez (bkz. çağrı yerleri). */
  onToggleSaveWord: (wordId: string, sourceSegmentId?: string | null) => void;
  /** Chunk 15 — AYNI "tek mantıksal state, Feed.tsx'te yaşar" deseni (bkz. use-vocabulary-hint.ts). */
  vocabularyHintVisible: boolean;
  onDismissVocabularyHint: () => void;
};

export function VideoFeedItem({
  video,
  isActive,
  height,
  width,
  userId,
  isWordSaved,
  isWordPending,
  onToggleSaveWord,
  vocabularyHintVisible,
  onDismissVocabularyHint,
}: VideoFeedItemProps) {
  const insets = useSafeAreaInsets();
  const [sourceOpen, setSourceOpen] = useState(false);
  const resumeAfterSource = useRef(false);

  // useVideoPlayer, component unmount olduğunda player'ı otomatik temizler.
  // Burada sadece başlangıç ayarlarını yapıyoruz (döngü + subtitle sync için
  // timeUpdate aralığı); play/pause kararı isActive'e bağlı olduğu için
  // aşağıdaki useEffect'te veriliyor.
  const player = useVideoPlayer(video.playbackUrl, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.timeUpdateEventInterval =
      SUBTITLE_TIME_UPDATE_INTERVAL_SECONDS;
  });

  // Chunk 10 — video → subtitle → tap → explanation akışı. `activeSegment`
  // player'ın native timeUpdate'ine göre CANLI değişir (bkz. useActiveSubtitle).
  // `openSegment` ise tıklandığı anda SNAPSHOT'lanan, sheet kapanana kadar
  // asla değişmeyen dondurulmuş kopya — ikisi BİLİNÇLİ OLARAK ayrı state:
  // sheet açıkken activeSegment değişse bile (video zaten pause'da, ama seek/
  // stall gibi bir tetikleyici teorik olarak yine de bir timeUpdate üretebilir)
  // gösterilen açıklama ASLA değişmemeli.
  const activeSegment = useActiveSubtitle(player, video.segments);
  const [openSegment, setOpenSegment] = useState<TranscriptSegment | null>(
    null,
  );
  // Chunk 14 — word-tap: subtitle içindeki bilinen bir vocabulary kelimesine
  // dokunulunca açılan AYRI bir sheet. `openSegment`'le AYNI snapshot deseni
  // (bkz. yukarısı) — ikisi ASLA aynı anda açık olamaz (biri açıkken Modal tüm
  // ekranı kapladığı için diğerine dokunmak mümkün değil), bu yüzden AYNI
  // `wasPlayingBeforeOpenRef`'i güvenle paylaşıyorlar.
  const [openVocabularyWord, setOpenVocabularyWord] =
    useState<VideoVocabularyItem | null>(null);
  // Chunk 16 — kelimenin tıklandığı ANDAKİ segment'in id'si, `openVocabularyWord`
  // ile AYNI snapshot ömrüne sahip (birlikte set/reset edilir). save() bu segment
  // id'sini "gerçek kaynak context" olarak backend'e gönderir — TAHMİNİ bir
  // context ASLA üretilmiyor.
  const [openVocabularySegmentId, setOpenVocabularySegmentId] = useState<
    string | null
  >(null);
  const wasPlayingBeforeOpenRef = useRef(false);
  /**
   * Root cause fix — `player.playing`, sheet açılırken (handleSubtitleTap/
   * handleVocabularyWordTap) `wasPlayingBeforeOpenRef`'i doldurmak için
   * SENKRON olarak okunuyordu, ama native tarafta play()/pause()'un GERÇEKTEN
   * uygulanması asenkron (native bridge) — bir video `isActive` olduğu için
   * yeni play() edilmişse, `player.playing` bu senkron okuma anında henüz
   * `false` dönebiliyordu. Sonuç: `wasPlayingBeforeOpenRef.current` yanlışlıkla
   * `false` yazılıyor, sheet kapanınca `player.play()` hiç çağrılmıyor, video
   * kalıcı paused kalıyor ("donma", timing'e bağlı olarak ARADA BİR).
   * Çözüm: player'ın kendi `playingChange` event'inin (aşağıda, mevcut
   * watchedMs listener'ı İÇİNDE) native-onaylı son değerini bu ref'te canlı
   * tutup, sheet açılırken `player.playing` YERİNE bunu okumak — başka bir
   * player lifecycle değişikliği YOK.
   */
  const isPlayingRef = useRef(player.playing);

  // Chunk 16 revizyon — bottom-sheet'in açık/kapalı durumu. Item'a özel, lokal
  // UI state: `useSavedWordIds`/`useVocabularyHint`'in aksine BİRDEN FAZLA
  // video arasında paylaşılan mantıksal bir gerçek DEĞİL (her video'nun kendi
  // sheet'i kendi açık/kapalı durumuna sahip olmalı), bu yüzden Feed.tsx'e
  // taşınmadı.
  const [vocabularyExpanded, setVocabularyExpanded] = useState(false);
  const vocabularyPanelHeight = height * VOCABULARY_PANEL_HEIGHT_RATIO;
  function handleSubtitleTap(segment: TranscriptSegment): void {
    wasPlayingBeforeOpenRef.current = isPlayingRef.current;
    player.pause();
    setOpenSegment(segment);
  }

  function handleCloseSheet(): void {
    setOpenSegment(null);
    // Sadece açılmadan ÖNCE gerçekten oynatılıyorduysa VE bu item hâlâ aktifse
    // resume et — isActive false'a düşmüşse (kullanıcı scroll etmiş) isActive
    // effect'i zaten paused tutuyor, burada onunla çakışmamalıyız.
    if (wasPlayingBeforeOpenRef.current && isActive) {
      player.play();
    }
  }

  function handleVocabularyWordTap(
    word: VideoVocabularyItem,
    segment: TranscriptSegment,
  ): void {
    wasPlayingBeforeOpenRef.current = isPlayingRef.current;
    player.pause();
    setOpenVocabularyWord(word);
    setOpenVocabularySegmentId(segment.id);
  }

  function handleCloseVocabularySheet(): void {
    setOpenVocabularyWord(null);
    setOpenVocabularySegmentId(null);
    if (wasPlayingBeforeOpenRef.current && isActive) {
      player.play();
    }
  }

  // watchedMs'i "isActive olduğu wall-clock süre" ile ölçmüyoruz — bu, buffering/
  // loading sırasında player henüz hiçbir kare oynatmıyorken bile süreyi şişirir.
  // Bunun yerine player'ın kendi `playingChange` event'ini dinliyoruz: bu event
  // native player'ın GERÇEKTEN oynatma durumuna göre tetiklenir (buffer/stall
  // sırasında isPlaying false'a düşer). accumulatedMsRef önceki kapanmış play
  // segment'lerinin toplamı; playingSinceRef şu an açık olan (henüz kapanmamış)
  // segment'in başlangıç zamanı, segment yoksa null.
  const accumulatedMsRef = useRef(0);
  const playingSinceRef = useRef<number | null>(null);

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) {
      playingSinceRef.current = Date.now();
      return;
    }
    if (playingSinceRef.current !== null) {
      accumulatedMsRef.current += Date.now() - playingSinceRef.current;
      playingSinceRef.current = null;
    }
  });

  /**
   * Chunk 15, madde 8 — video playback hatası (bozuk/erişilemez medya dosyası
   * vb.) için fallback. `expo-video`'nun `statusChange` event'i `status`'un
   * `"error"`e geçtiği anı bildiriyor — mevcut kodda ŞİMDİYE KADAR hiç
   * dinlenmiyordu (audit'te bulunan gerçek boşluk). Retry butonu YOK
   * (bilinçli, madde 8 sadece "fallback ekle" diyor — kullanıcının doğal
   * kurtarma yolu zaten scroll edip bir sonraki videoya geçmek).
   */
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  useEventListener(player, "statusChange", ({ status }) => {
    setPlaybackError(status === "error" ? "Bu video oynatılamadı." : null);
  });

  // Aktiflik değiştiğinde player'ı buna göre başlat/durdur. FlatList kaydırma
  // akıcılığı için ekran dışındaki komşu öğeleri de mount edilmiş tutabilir —
  // bu yüzden "oynatma" isActive === true olduğunda play() çağırmaya değil,
  // isActive === false olduğunda AÇIKÇA pause() çağırmaya dayanıyor.
  useEffect(() => {
    if (isActive) {
      // Yeni bir exposure başlıyor — normalde önceki exposure'ın cleanup'ı zaten
      // sıfırlamış olur, yine de açıkça sıfırlıyoruz.
      accumulatedMsRef.current = 0;
      playingSinceRef.current = null;
      // Kullanıcı geri bildirimi — video yarıda kaydırılıp geri dönüldüğünde
      // kaldığı yerden DEĞİL, baştan başlamalı (her video için, tutarlı bir
      // kural): bu bir TikTok/Reels-tarzı feed, altyazı-senkron bir öğrenme
      // videosuna cümlenin ortasından dönmek, baştan izlemekten daha kafa
      // karıştırıcı. `pause()` currentTime'ı hiç sıfırlamıyordu (bkz. aşağıdaki
      // else dalı) — bu yüzden reset burada, YENİDEN aktif olma anında yapılıyor
      // (pasife geçerken değil — geçiş sırasında görünür bir "başa sıçrama"
      // titremesi yaratmamak için).
      player.replay();
      player.play();
    } else {
      player.pause();
    }

    // Bu cleanup, isActive === true İKEN kurulan bir effect run'ının kapanışında
    // çalışır — yani ya isActive false'a dönüyor ya da component isActive:true
    // durumdayken unmount ediliyor. Her iki durum da bu exposure'ın sonu: henüz
    // açık bir play segment'i varsa (native pause event'i asenkron geldiği için
    // henüz kapanmamış olabilir) burada wall-clock ile kapatılıyor, ardından
    // toplam watchedMs tek bir event olarak raporlanıyor. isActive === false iken
    // kurulan run'ların cleanup'ı hiçbir şey yapmaz (o exposure zaten yok).
    return () => {
      if (!isActive) {
        return;
      }
      if (playingSinceRef.current !== null) {
        accumulatedMsRef.current += Date.now() - playingSinceRef.current;
        playingSinceRef.current = null;
      }
      const watchedMs = accumulatedMsRef.current;
      accumulatedMsRef.current = 0;
      if (watchedMs > 0) {
        recordVideoWatchEvent(video.id, userId, watchedMs).catch(() => {
          // Chunk 5'teki quiz-answer hata davranışıyla aynı minimalist tutum:
          // ayrı bir retry/hata UI'ı yok, sessizce yutuluyor.
        });
      }
    };
  }, [isActive, player, video.id, userId]);

  return (
    // 2026-09-30 — animasyon içeriği "contain" ile (kırpmadan) gösteriliyor, bu
    // yüzden geniş ekran kaynak letterbox/pillarbox boşluk bırakıyor. O boşluk,
    // sabit siyah yerine içerik hazırlığında (ffmpeg kare ortalaması, TEK
    // SEFERLİK) hesaplanmış `video.backgroundColor` ile dolduruluyor — ikinci
    // bir video/görsel katmanı YOK (performans kararı), sadece container'ın
    // arka plan rengi. "cover" ile gösterilen genel içerikte backgroundColor
    // hep null'dır (video zaten ekranı dolduruyor), bu yüzden davranış değişmez.
    <View style={[styles.container, { height, width, backgroundColor: video.backgroundColor ?? "#000" }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit={video.category === "animation" ? "contain" : "cover"}
        nativeControls={false}
      />
      {video.attribution && (
        <>
          <Pressable
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              backgroundColor: "#211b2cdd",
              borderRadius: 8,
              padding: 10,
            }}
            accessibilityRole="button"
            accessibilityLabel="Sahnenin kaynak ve lisans bilgisi"
            onPress={() => {
              resumeAfterSource.current = player.playing;
              player.pause();
              setSourceOpen(true);
            }}
          >
            <Text style={{ color: "#d7c5ff", fontSize: 12 }}>
              {video.attribution.title} · {video.attribution.license}
            </Text>
          </Pressable>
          <VideoAttributionSheet
            attribution={video.attribution}
            open={sourceOpen}
            onClose={() => {
              setSourceOpen(false);
              if (resumeAfterSource.current && isActive) player.play();
            }}
          />
        </>
      )}
      {playbackError && (
        <View style={styles.playbackErrorOverlay}>
          <Text style={styles.playbackErrorText}>{playbackError}</Text>
        </View>
      )}
      <View
        style={[
          styles.learningDock,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <ScrollView
          key={activeSegment?.id ?? "gap"}
          style={{ maxHeight: height * 0.3 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <SubtitleOverlay
            segment={activeSegment}
            onPress={handleSubtitleTap}
            vocabulary={video.vocabulary}
            onPressWord={handleVocabularyWordTap}
          />
        </ScrollView>
        <ExplanationSheet
          segment={openSegment}
          vocabulary={video.vocabulary}
          onClose={handleCloseSheet}
        />
        <VocabularyWordSheet
          word={openVocabularyWord}
          onClose={handleCloseVocabularySheet}
          isSaved={
            openVocabularyWord ? isWordSaved(openVocabularyWord.word.id) : false
          }
          isPending={
            openVocabularyWord
              ? isWordPending(openVocabularyWord.word.id)
              : false
          }
          onToggleSave={() => {
            if (openVocabularyWord) {
              onToggleSaveWord(
                openVocabularyWord.word.id,
                openVocabularySegmentId,
              );
            }
          }}
        />
        {isActive &&
          video.vocabulary.length > 0 &&
          vocabularyHintVisible &&
          !vocabularyExpanded && (
            <Pressable
              style={styles.vocabularyHint}
              onPress={onDismissVocabularyHint}
            >
              <Text style={styles.vocabularyHintText}>
                Vurgulu kelimeye dokun → anlamını gör ve kaydet
              </Text>
            </Pressable>
          )}
        {video.vocabulary.length > 0 && (
          // Kaydırılabilir kelime listesi normal akışta altyazının altında kalır.
          <View style={styles.vocabularySheet}>
            {vocabularyExpanded && (
              <ScrollView
                style={[
                  styles.vocabularyList,
                  { maxHeight: vocabularyPanelHeight },
                ]}
                contentContainerStyle={styles.vocabularyListContent}
                // 2026-09-30 — kapalıyken kaydırılabilir olduğu hiç belli
                // olmuyordu; alttaki kart ortadan kesilince bu bug gibi
                // görünüyordu. Bilinçli olarak SADECE burada açık — altyazı
                // scroll'u (yukarıda) nadiren taşıyor, göstergeye ihtiyacı yok.
                showsVerticalScrollIndicator
              >
                {video.vocabulary.map(({ word }) => {
                  // Backend'in bu occurrence için gömdüğü `saved` alanı BİLİNÇLİ OLARAK
                  // okunmuyor — tek mantıksal gerçek Feed.tsx'teki useSavedWordIds'te
                  // yaşıyor (aynı wordId birden fazla videoda görünebildiği için).
                  const saved = isWordSaved(word.id);
                  const pending = isWordPending(word.id);
                  return (
                    <Pressable
                      key={word.id}
                      onPress={() => onToggleSaveWord(word.id)}
                      disabled={pending}
                      accessibilityRole="button"
                      accessibilityLabel={`${word.lemma}: ${word.gloss}. ${saved ? "Kaydı kaldır" : "Kaydet"}`}
                      style={[styles.wordChip, saved && styles.wordChipSaved]}
                    >
                      <Text style={styles.wordLemma}>{word.lemma}</Text>
                      <Text style={styles.wordGloss}>{word.gloss}</Text>
                      <Text style={styles.wordAction}>
                        {pending ? "…" : saved ? "Kaydedildi ✓" : "Kaydet"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <Pressable
              style={styles.vocabularyHandle}
              accessibilityRole="button"
              accessibilityState={{ expanded: vocabularyExpanded }}
              accessibilityLabel={`${video.vocabulary.length} kelime, ${vocabularyExpanded ? "listeyi kapat" : "listeyi aç"}`}
              onPress={() => setVocabularyExpanded((expanded) => !expanded)}
            >
              <View style={styles.vocabularyHandleCopy}>
                <Text style={styles.vocabularyHandleText}>
                  {video.vocabulary.length} kelimeyi keşfet
                </Text>
                <Text style={styles.vocabularyHandleCaption}>
                  Anlamını öğren, koleksiyonuna ekle
                </Text>
              </View>
              <Text style={styles.vocabularyHandleChevron}>
                {vocabularyExpanded ? "▼" : "▲"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
  },
  playbackErrorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  playbackErrorText: {
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 32,
    textAlign: "center",
  },
  learningDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
  },
  vocabularyHint: {
    backgroundColor: "#ddf9a8",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  vocabularyHintText: {
    color: "#202718",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  vocabularySheet: { gap: 8 },
  vocabularyList: {
    backgroundColor: "rgba(17,17,22,0.96)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#393343",
  },
  vocabularyListContent: { gap: 8, padding: 10 },
  vocabularyHandle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#24212f",
    borderWidth: 1,
    borderColor: "#514666",
    borderRadius: 20,
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  vocabularyHandleCopy: { flex: 1, gap: 3 },
  vocabularyHandleText: {
    color: "#f5f4f9",
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  vocabularyHandleCaption: { color: "#b7afc7", fontSize: 11, flexShrink: 1 },
  vocabularyHandleChevron: { color: "#bca7ff", fontSize: 14 },
  wordChip: {
    backgroundColor: "#24212f",
    borderWidth: 1,
    borderColor: "#3b344c",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  wordChipSaved: { borderColor: "#ddf9a8", backgroundColor: "#242c22" },
  wordLemma: {
    color: "#f5f4f9",
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  wordGloss: { color: "#c6c1d1", fontSize: 14, flexShrink: 1 },
  wordAction: {
    color: "#ddf9a8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});
