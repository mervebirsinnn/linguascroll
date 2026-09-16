import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import type { FeedPlayableVideo, TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
import { recordVideoWatchEvent } from "../api/record-video-watch-event";
import { ExplanationSheet } from "../../subtitles/ExplanationSheet";
import { SubtitleOverlay } from "../../subtitles/SubtitleOverlay";
import { useActiveSubtitle } from "../../subtitles/use-active-subtitle";
import { VocabularyWordSheet } from "../../subtitles/VocabularyWordSheet";

/** timeUpdate event'inin native aralığı (saniye) — okunabilirlik için yeterli, gereksiz re-render yaratmayacak kadar seyrek. */
const SUBTITLE_TIME_UPDATE_INTERVAL_SECONDS = 0.25;

/**
 * Chunk 16 revizyon — cihaz smoke test'inde bulunan bug'ın kalıcı çözümü:
 * vocabulary listesi artık HER ZAMAN görünür, video'nun üstünü kaplayan bir
 * panel DEĞİL — varsayılan olarak KAPALI, sadece küçük bir "N kelime" kontrolü
 * gösteren, dokununca video'nun altından yukarı doğru açılan bir bottom-sheet.
 *
 * `react-native-safe-area-context` bu repo'da hiç bağımlı değil (bkz.
 * pnpm-lock.yaml) — yeni bir native dependency eklemek yerine, iPhone'un home
 * indicator alanı için bilinen (Apple HIG'in tüm notch/Dynamic Island'lı
 * modellerde sabit tuttuğu) 34pt'lik payı burada SABİT bir değer olarak
 * kullanıyoruz. Bunun native `useSafeAreaInsets()`'ten farkı: dinamik değil,
 * ama a) bu repo'da hiçbir ekran zaten dinamik safe-area kullanmıyor (bkz.
 * Feed.tsx — useWindowDimensions, insets değil), b) tek ihtiyacımız "handle
 * home indicator'ın ALTINDA kalmasın" — sabit 34pt bunun için yeterli ve
 * doğru, c) subtitle'ın `bottomOffset`'ini AYNI sabitle hesaplıyoruz (aşağı),
 * bu yüzden native bir API'nin geç gelen/yanlış senkronize olan değeriyle
 * layout'un çakışması riski hiç yok.
 */
const IOS_HOME_INDICATOR_INSET = Platform.OS === "ios" ? 34 : 0;
/** Kapalı haldeki "N kelime ▲" kontrolünün yaklaşık yüksekliği (padding dahil). */
const VOCABULARY_HANDLE_HEIGHT = 44;
/** İstenen %45–55 aralığının ortası — açık panel, video/ekran yüksekliğinin bu oranını aşmaz. */
const VOCABULARY_PANEL_HEIGHT_RATIO = 0.5;
/** Panel kapalıyken subtitle'ın eskiden beri kullandığı sabit konum (SubtitleOverlay.tsx'in eski varsayılanıyla AYNI) — collapsed'ta hiçbir şey değişmiyor. */
const SUBTITLE_DEFAULT_BOTTOM = 96;
/** Panel açıkken subtitle ile panelin üst kenarı arasındaki nefes payı. */
const SUBTITLE_GAP_ABOVE_EXPANDED_PANEL = 12;

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
  // useVideoPlayer, component unmount olduğunda player'ı otomatik temizler.
  // Burada sadece başlangıç ayarlarını yapıyoruz (döngü + subtitle sync için
  // timeUpdate aralığı); play/pause kararı isActive'e bağlı olduğu için
  // aşağıdaki useEffect'te veriliyor.
  const player = useVideoPlayer(video.playbackUrl, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.timeUpdateEventInterval = SUBTITLE_TIME_UPDATE_INTERVAL_SECONDS;
  });

  // Chunk 10 — video → subtitle → tap → explanation akışı. `activeSegment`
  // player'ın native timeUpdate'ine göre CANLI değişir (bkz. useActiveSubtitle).
  // `openSegment` ise tıklandığı anda SNAPSHOT'lanan, sheet kapanana kadar
  // asla değişmeyen dondurulmuş kopya — ikisi BİLİNÇLİ OLARAK ayrı state:
  // sheet açıkken activeSegment değişse bile (video zaten pause'da, ama seek/
  // stall gibi bir tetikleyici teorik olarak yine de bir timeUpdate üretebilir)
  // gösterilen açıklama ASLA değişmemeli.
  const activeSegment = useActiveSubtitle(player, video.segments);
  const [openSegment, setOpenSegment] = useState<TranscriptSegment | null>(null);
  // Chunk 14 — word-tap: subtitle içindeki bilinen bir vocabulary kelimesine
  // dokunulunca açılan AYRI bir sheet. `openSegment`'le AYNI snapshot deseni
  // (bkz. yukarısı) — ikisi ASLA aynı anda açık olamaz (biri açıkken Modal tüm
  // ekranı kapladığı için diğerine dokunmak mümkün değil), bu yüzden AYNI
  // `wasPlayingBeforeOpenRef`'i güvenle paylaşıyorlar.
  const [openVocabularyWord, setOpenVocabularyWord] = useState<VideoVocabularyItem | null>(null);
  // Chunk 16 — kelimenin tıklandığı ANDAKİ segment'in id'si, `openVocabularyWord`
  // ile AYNI snapshot ömrüne sahip (birlikte set/reset edilir). save() bu segment
  // id'sini "gerçek kaynak context" olarak backend'e gönderir — TAHMİNİ bir
  // context ASLA üretilmiyor.
  const [openVocabularySegmentId, setOpenVocabularySegmentId] = useState<string | null>(null);
  const wasPlayingBeforeOpenRef = useRef(false);

  // Chunk 16 revizyon — bottom-sheet'in açık/kapalı durumu. Item'a özel, lokal
  // UI state: `useSavedWordIds`/`useVocabularyHint`'in aksine BİRDEN FAZLA
  // video arasında paylaşılan mantıksal bir gerçek DEĞİL (her video'nun kendi
  // sheet'i kendi açık/kapalı durumuna sahip olmalı), bu yüzden Feed.tsx'e
  // taşınmadı.
  const [vocabularyExpanded, setVocabularyExpanded] = useState(false);
  const vocabularyPanelHeight = height * VOCABULARY_PANEL_HEIGHT_RATIO;
  // Sheet'in TAMAMININ (handle + varsa açık panel + home-indicator payı)
  // ekran altından kapladığı toplam yükseklik — subtitle'ın konumu SADECE bu
  // değere göre hesaplanıyor (bkz. SubtitleOverlay.tsx'teki "zIndex yeterli
  // değil, gerçek pozisyon gerekir" yorumu).
  const vocabularySheetHeight =
    VOCABULARY_HANDLE_HEIGHT + IOS_HOME_INDICATOR_INSET + (vocabularyExpanded ? vocabularyPanelHeight : 0);
  const subtitleBottomOffset =
    video.vocabulary.length > 0 && vocabularyExpanded
      ? vocabularySheetHeight + SUBTITLE_GAP_ABOVE_EXPANDED_PANEL
      : SUBTITLE_DEFAULT_BOTTOM;

  function handleSubtitleTap(segment: TranscriptSegment): void {
    wasPlayingBeforeOpenRef.current = player.playing;
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

  function handleVocabularyWordTap(word: VideoVocabularyItem, segment: TranscriptSegment): void {
    wasPlayingBeforeOpenRef.current = player.playing;
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
    <View style={[styles.container, { height, width }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      {playbackError && (
        <View style={styles.playbackErrorOverlay}>
          <Text style={styles.playbackErrorText}>{playbackError}</Text>
        </View>
      )}
      <SubtitleOverlay
        segment={activeSegment}
        onPress={handleSubtitleTap}
        vocabulary={video.vocabulary}
        onPressWord={handleVocabularyWordTap}
        bottomOffset={subtitleBottomOffset}
      />
      <ExplanationSheet segment={openSegment} vocabulary={video.vocabulary} onClose={handleCloseSheet} />
      <VocabularyWordSheet
        word={openVocabularyWord}
        onClose={handleCloseVocabularySheet}
        isSaved={openVocabularyWord ? isWordSaved(openVocabularyWord.word.id) : false}
        isPending={openVocabularyWord ? isWordPending(openVocabularyWord.word.id) : false}
        onToggleSave={() => {
          if (openVocabularyWord) {
            onToggleSaveWord(openVocabularyWord.word.id, openVocabularySegmentId);
          }
        }}
      />
      {isActive && video.vocabulary.length > 0 && vocabularyHintVisible && !vocabularyExpanded && (
        <Pressable style={styles.vocabularyHint} onPress={onDismissVocabularyHint}>
          <Text style={styles.vocabularyHintText}>Vurgulu kelimeye dokun → anlamını gör ve kaydet</Text>
        </Pressable>
      )}
      {video.vocabulary.length > 0 && (
        // Chunk 16 revizyon — cihaz smoke test'inde bulunan bug'ın kalıcı çözümü:
        // panel artık her zaman açık, sınırsız yükseklikte büyüyen bir liste
        // DEĞİL — varsayılan KAPALI bir bottom-sheet. `vocabularySheetHeight`
        // (yukarıda hesaplanan) SubtitleOverlay'e geçirilen `bottomOffset`'le
        // AYNI kaynaktan besleniyor, bu yüzden ikisi asla çakışmıyor — zIndex
        // burada bir GÜVENLİK AĞI, birincil mekanizma DEĞİL.
        <View style={styles.vocabularySheet}>
          {vocabularyExpanded && (
            <ScrollView
              style={[styles.vocabularyList, { maxHeight: vocabularyPanelHeight }]}
              contentContainerStyle={styles.vocabularyListContent}
              showsVerticalScrollIndicator={false}
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
                    style={[styles.wordChip, saved && styles.wordChipSaved]}
                  >
                    <Text style={styles.wordLemma}>{word.lemma}</Text>
                    <Text style={styles.wordGloss}>{word.gloss}</Text>
                    <Text style={styles.wordAction}>{pending ? "…" : saved ? "Kaydedildi ✓" : "Kaydet"}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Pressable
            style={[styles.vocabularyHandle, { paddingBottom: 10 + IOS_HOME_INDICATOR_INSET }]}
            onPress={() => setVocabularyExpanded((expanded) => !expanded)}
          >
            <Text style={styles.vocabularyHandleText}>{video.vocabulary.length} kelime</Text>
            <Text style={styles.vocabularyHandleChevron}>{vocabularyExpanded ? "▼" : "▲"}</Text>
          </Pressable>
        </View>
      )}
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
  vocabularyHint: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 200,
    backgroundColor: "rgba(142,205,250,0.95)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  vocabularyHintText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  vocabularySheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    // SubtitleOverlay.tsx'teki zIndex: 10'dan BİLİNÇLİ OLARAK düşük — güvenlik
    // ağı, birincil mekanizma değil (bkz. yukarıdaki render yorumu).
    zIndex: 1,
    elevation: 1,
  },
  vocabularyList: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    marginBottom: 8,
  },
  vocabularyListContent: {
    gap: 8,
    padding: 8,
  },
  vocabularyHandle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(17,17,17,0.85)",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 20,
    paddingTop: 10,
    // paddingBottom, render'da IOS_HOME_INDICATOR_INSET ile ezilir (bkz. yukarı).
  },
  vocabularyHandleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  vocabularyHandleChevron: {
    color: "#8ecdfa",
    fontSize: 12,
  },
  wordChip: {
    backgroundColor: "rgba(17,17,17,0.85)",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  wordChipSaved: {
    borderColor: "#2ecc71",
  },
  wordLemma: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  wordGloss: {
    color: "#ccc",
    fontSize: 13,
  },
  wordAction: {
    color: "#8ecdfa",
    fontSize: 13,
    marginTop: 2,
  },
});
