import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import type {
  ContentCategory,
  FeedItem,
  FeedPreferences,
} from "@linguascroll/shared-types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFeed } from "../hooks/use-feed";
import { useSavedWordIds } from "../hooks/use-saved-word-ids";
import { useVocabularyHint } from "../hooks/use-vocabulary-hint";
import { FeedListFooter } from "./FeedListFooter";
import { getFeedItemKey } from "./get-feed-item-key";
import { QuizFeedItem } from "./QuizFeedItem";
import { VideoFeedItem } from "./VideoFeedItem";

// looplish.app'in favicon.svg'siyle AYNI logo (L harfi + oynat üçgeni). react-native-svg
// bağımlılığı eklememek için PNG olarak üretilmiş (bkz. assets/brand-mark.png).
const brandMarkImage = require("../../../../assets/brand-mark.png") as number;

// %90'ı ekranda olan öğe "aktif" kabul edilir. FlatList, bu prop'un render'lar
// arasında referans olarak sabit kalmasını bekler — bu yüzden useRef içinde tutuluyor.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 90 };

/**
 * Root cause #1 (hızlı repeated scroll'da donma) — item'lar TAM EKRAN
 * (`getItemLayout`: length = height, pagingEnabled) olduğu için VirtualizedList'in
 * "windowSize ekran-yüksekliği birimi" tanımı burada ≈ "item sayısı" ile
 * örtüşüyor. RN'in varsayılanı (windowSize=21) bu yüzden aktif item'ın 10
 * "ekranı" üstü + 10 altı, yani teorik olarak aynı anda 21'e kadar VideoFeedItem
 * (her biri kendi native video player/decoder'ını KOŞULSUZ yaratıyor, bkz.
 * VideoFeedItem.tsx'teki useVideoPlayer çağrısı) mount kalmasına izin veriyordu.
 * Bu üç sabit, "aktif + yakın birkaç komşu" hedefiyle bilinçli olarak dar:
 *  - WINDOW_SIZE=5 → aktif item + ~2 üst + ~2 alt komşu (21'in ~1/4'ü).
 *  - INITIAL_NUM_TO_RENDER=2 → ilk mount'ta boş/beyaz ilk frame olmasın diye
 *    SADECE aktif + bir sonraki item.
 *  - MAX_TO_RENDER_PER_BATCH=2 → hızlı fling sırasında bir batch'te en fazla
 *    2 YENİ item mount olur — çok sayıda player'ın aynı anda/art arda
 *    allocate edilmesini (Candidate #1'in asıl mekanizması) engeller, ama
 *    fling'in kendi hızını YAVAŞLATMAZ (bu sadece kaç item'ın ÖNCEDEN mount
 *    edildiğini sınırlar, scroll'un kendisi native tarafta zaten akıcı).
 * `removeClippedSubviews` BİLİNÇLİ OLARAK eklenmedi: her VideoFeedItem
 * mutlak-konumlu overlay'ler (SubtitleOverlay, vocabularySheet) ve Modal'lar
 * (ExplanationSheet, VocabularyWordSheet) barındırıyor — RN'in kendi
 * dokümantasyonu bu prop'u "bazı durumlarda içerik kaybı bug'ları olabilir"
 * diye işaretliyor; windowSize zaten 21'den 5'e indiği için ek kazancı
 * marjinal, riski ("boş/beyaz frame" hedefiyle DOĞRUDAN çelişen bir bug
 * sınıfı) buna değmiyor.
 */
const WINDOW_SIZE = 5;
const INITIAL_NUM_TO_RENDER = 2;
const MAX_TO_RENDER_PER_BATCH = 2;

type FeedProps = {
  userId: string;
  /** Chunk 15 — onboarding'in level/topics'i, SADECE ilk session'ı etkiler (bkz. use-feed.ts). */
  preference?: FeedPreferences;
  /**
   * Chunk 16 — Memory ekranına (Saved/Review/Progress) giden TEK giriş noktası.
   * Feed birincil ürün olarak kalıyor (madde 11): bu sadece küçük, isteğe bağlı
   * bir buton — hiçbir şekilde feed akışına zorla bir kesinti olarak enjekte
   * edilmiyor.
   */
  onOpenMemory: () => void;
};

export function Feed(props: FeedProps) {
  const [category, setCategory] = useState<ContentCategory>("general");
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState({ height: 0, width: 0 });
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.brandGroup}>
            <Image source={brandMarkImage} style={styles.brandMark} accessibilityLabel="Looplish" />
            <Text style={styles.brand}>Looplish</Text>
          </View>
          <Pressable
            style={styles.memoryButton}
            onPress={props.onOpenMemory}
            accessibilityRole="button"
          >
            <Text style={styles.memoryButtonText}>Kelimelerim</Text>
          </Pressable>
        </View>
        <View style={styles.categoryRow}>
          {(["general", "animation"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setCategory(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: category === value }}
              style={[
                styles.categoryButton,
                category === value && styles.categorySelected,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === value && styles.categorySelectedText,
                ]}
              >
                {value === "general" ? "Akış" : "Animasyon"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {/* Bölüm değişince bütün oyuncular/istek state'i unmount olur; eski response yeni akışa eklenemez. */}
      {/* Gerçek layout ölçülür: Android sistem çubukları ve büyük yazı ayarı sabit ekran hesabını bozmaz. */}
      <View
        style={styles.root}
        onLayout={({ nativeEvent: { layout } }) =>
          setViewport({ height: layout.height, width: layout.width })
        }
      >
        {viewport.height > 0 && viewport.width > 0 && (
          <FeedContent
            key={`${props.userId}:${category}:${viewport.height}:${viewport.width}`}
            {...props}
            category={category}
            height={viewport.height}
            width={viewport.width}
          />
        )}
      </View>
    </View>
  );
}

function FeedContent({
  userId,
  preference,
  category,
  height,
  width,
}: FeedProps & { category: ContentCategory; height: number; width: number }) {
  const {
    state: feedState,
    loadMore,
    refresh,
  } = useFeed(userId, preference, category);

  // Tek ölçüm kaynağı: hem FlatList'in paging hesabı (getItemLayout) hem de her
  // item'ın gerçek render boyutu buradan, tek yerden besleniyor.
  // height/width, parent View onLayout ölçümünden gelir; tahmini header çıkarımı yapılmaz.

  // Kullanıcının kaydırarak seçtiği item'ın key'i (bkz. getFeedItemKey — FeedItem
  // nested olduğu için düz bir "id" alanı yok). Kaydırma henüz başlamadıysa null
  // kalır — bu durumda ilk item, render sırasında varsayılan olarak aktif sayılır.
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);

  // "Feed'i yenile" kullanıcının en alta (footer'a) kaydırmış OLDUĞU an
  // tetikleniyor — yeni session'ın içeriği (deterministic ranking yüzünden sık
  // sık ÖNCEKİYLE AYNI) items'a yazılsa bile, FlatList kendi scroll pozisyonunu
  // otomatik SIFIRLAMIYOR. Bu yüzden refresh GERÇEKTEN başarılı olduğunda listeyi
  // elle başa (offset 0) kaydırıyoruz — aksi halde kullanıcı hâlâ footer'da kalır
  // ve "yenile hiçbir şey yapmadı" izlenimi oluşur (gerçek kullanıcı raporu).
  // `activeItemKey`'i de sıfırlıyoruz ki "aktif" (oynatılan) video da yeni
  // session'ın ilk item'ıyla tutarlı olsun — FlatList'in kendi
  // onViewableItemsChanged'i scroll bitene kadar henüz tetiklenmemiş olabilir.
  const flatListRef = useRef<FlatList>(null);

  function handleRefresh(): void {
    refresh()
      .then(() => {
        setActiveItemKey(null);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      })
      .catch(() => {
        // Hata zaten FeedListFooter'da loadMoreError olarak gösteriliyor —
        // scroll pozisyonu BİLEREK değiştirilmiyor, kullanıcı retry edebilsin.
      });
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const activeItem = viewableItems[0]?.item as FeedItem | undefined;
      if (activeItem) {
        setActiveItemKey(getFeedItemKey(activeItem));
      }
    },
  ).current;

  // Chunk 9: aynı wordId aynı anda birden fazla yüklü videoda görünebildiği
  // (video_words many-to-many) için tek mantıksal saved-state BURADA, tüm
  // VideoFeedItem'ların ortak atasında yaşıyor — useFeed'e hiç dokunulmuyor
  // (ayrı, kardeş bir hook). Hook'lar koşulsuz çağrılmalı (Rules of Hooks),
  // bu yüzden "success" durumundan önceki early return'lardan ÖNCE çağrılıyor;
  // henüz veri yokken boş dizi ile besleniyor.
  const items = feedState.status === "success" ? feedState.items : [];
  const {
    isSaved: isWordSaved,
    isPending: isWordPending,
    toggleSave: onToggleSaveWord,
  } = useSavedWordIds(userId, items);
  // Chunk 15 — AYNI "tek mantıksal state, tüm VideoFeedItem'ların ortak
  // atasında" deseni (bkz. useSavedWordIds yorumu) — bkz. use-vocabulary-hint.ts.
  const vocabularyHint = useVocabularyHint();

  if (feedState.status === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Yükleniyor…</Text>
      </View>
    );
  }

  if (feedState.status === "error") {
    // Chunk 15 — kullanıcı-dostu, teknik olmayan mesaj (madde 7). 2026-09-30:
    // `feedState.message` artık zaten kullanıcı-dostu (bkz. use-feed.ts'teki
    // errorMessage()) — ham teknik metin ASLA buraya kadar gelmiyor, bu yüzden
    // burada sabit bir string yerine doğrudan gösterilebiliyor (sunucu-yoğun
    // ile bağlantı-sorunu mesajları artık burada da doğru ayrışıyor).
    // 2026-10-01 — gerçek bulgu: bu ekranda retry YOKTU, kullanıcı uygulamayı
    // kapatıp açmak zorunda kalıyordu (footer'daki loadMore/refresh hatasında
    // zaten vardı, sadece İLK yükleme burada eksikti). `handleRefresh` zaten
    // var olan, aşağıdaki boş-liste durumuyla AYNI fonksiyon — cursor'sız yeni
    // bir session dener.
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{feedState.message}</Text>
        <Pressable onPress={handleRefresh} accessibilityRole="button" style={styles.categoryButton}>
          <Text style={styles.categoryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  const { nextCursor, isLoadingMore, loadMoreError } = feedState;
  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          {category === "animation"
            ? "Animasyon sahneleri henüz yayımlanmadı."
            : "Henüz video yok."}
        </Text>
        <Pressable
          onPress={handleRefresh}
          accessibilityRole="button"
          style={styles.categoryButton}
        >
          <Text style={styles.categoryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }
  const firstItem = items[0];
  const resolvedActiveItemKey =
    activeItemKey ?? (firstItem ? getFeedItemKey(firstItem) : null);

  // FeedListFooter'ın tek eylem butonu iki farklı şeyi tetikleyebilir: bir
  // continuation hatasından sonra retry (loadMore) veya session bitince yeni
  // bir session (refresh). Ayrım burada, nextCursor'a göre: loadMore zaten
  // nextCursor null'ken hiç çalışmıyor (bkz. canLoadMore) — yani loadMoreError
  // ANCAK nextCursor non-null'ken loadMore'dan, nextCursor null'ken SADECE
  // refresh'ten gelmiş olabilir.
  const footerAction = nextCursor === null ? handleRefresh : loadMore;

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={getFeedItemKey}
        renderItem={({ item }) => {
          const isActive = getFeedItemKey(item) === resolvedActiveItemKey;
          if (item.type === "video") {
            return (
              <VideoFeedItem
                video={item.video}
                isActive={isActive}
                height={height}
                width={width}
                userId={userId}
                isWordSaved={isWordSaved}
                isWordPending={isWordPending}
                onToggleSaveWord={onToggleSaveWord}
                vocabularyHintVisible={vocabularyHint.visible}
                onDismissVocabularyHint={vocabularyHint.dismiss}
              />
            );
          }
          if (item.type === "quiz") {
            // Quiz item'lar isActive'e tepki vermiyor — video gibi play/pause'a
            // ihtiyaçları yok, statik render Chunk 5 kapsamında yeterli.
            return (
              <QuizFeedItem
                quiz={item.quiz}
                height={height}
                width={width}
                userId={userId}
              />
            );
          }
          // 2026-10-01 — ücretsiz günlük limit dolunca backend'in döndürdüğü
          // TERMİNAL item (bkz. feed.service.ts, nextCursor hep null gelir).
          // Bu GEÇİCİ bir yer tutucu — gerçek satın alma akışı (RevenueCat SDK,
          // paket listesi) ayrı bir iş; backend gate'i (abonelik olmayan + 10+
          // video izlemiş kullanıcılar) şu an gerçekten devrede, bu yüzden
          // kullanıcıya ASLA kırık bir ekran göstermemek için dürüst, işlevsiz
          // olmayan bir mesaj yeterli — var olmayan bir "satın al" butonu YOK.
          return (
            <View style={[styles.centered, { height, width }]}>
              <Text style={styles.message}>Bugünkü ücretsiz video hakkın doldu. Yarın tekrar gel!</Text>
            </View>
          );
        }}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        windowSize={WINDOW_SIZE}
        initialNumToRender={INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChanged}
        // Chunk 8: bounded frozen session'ın bir sonraki sayfasını çeker. useFeed
        // kendi concurrency guard'ını tutuyor (bkz. use-feed.ts) — burada ekstra
        // bir "zaten yükleniyor mu" kontrolüne gerek yok.
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <FeedListFooter
            height={height}
            width={width}
            nextCursor={nextCursor}
            isLoadingMore={isLoadingMore}
            loadMoreError={loadMoreError}
            onAction={footerAction}
          />
        }
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  memoryButton: {
    backgroundColor: "#24212f",
    borderWidth: 1,
    borderColor: "#3b344c",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    flexShrink: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: "#111116",
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: {
    width: 34,
    height: 34,
  },
  brand: {
    color: "#f5f4f9",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  categoryRow: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: 24,
    backgroundColor: "#24212d",
  },
  categoryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categorySelected: { backgroundColor: "#bca7ff" },
  categoryText: { color: "#aba8b9", fontSize: 14, fontWeight: "600" },
  categorySelectedText: { color: "#171221", fontWeight: "700" },
  memoryButtonText: {
    color: "#ddf9a8",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  list: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: "#fff",
  },
});
