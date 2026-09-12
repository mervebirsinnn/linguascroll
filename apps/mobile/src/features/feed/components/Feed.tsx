import { useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import type { FeedItem, FeedPreferences } from "@linguascroll/shared-types";
import { useFeed } from "../hooks/use-feed";
import { useSavedWordIds } from "../hooks/use-saved-word-ids";
import { useVocabularyHint } from "../hooks/use-vocabulary-hint";
import { FeedListFooter } from "./FeedListFooter";
import { getFeedItemKey } from "./get-feed-item-key";
import { QuizFeedItem } from "./QuizFeedItem";
import { VideoFeedItem } from "./VideoFeedItem";

// %90'ı ekranda olan öğe "aktif" kabul edilir. FlatList, bu prop'un render'lar
// arasında referans olarak sabit kalmasını bekler — bu yüzden useRef içinde tutuluyor.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 90 };

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

export function Feed({ userId, preference, onOpenMemory }: FeedProps) {
  const { state: feedState, loadMore, refresh } = useFeed(userId, preference);

  // Tek ölçüm kaynağı: hem FlatList'in paging hesabı (getItemLayout) hem de her
  // item'ın gerçek render boyutu buradan, tek yerden besleniyor.
  const { height, width } = useWindowDimensions();

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

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const activeItem = viewableItems[0]?.item as FeedItem | undefined;
    if (activeItem) {
      setActiveItemKey(getFeedItemKey(activeItem));
    }
  }).current;

  // Chunk 9: aynı wordId aynı anda birden fazla yüklü videoda görünebildiği
  // (video_words many-to-many) için tek mantıksal saved-state BURADA, tüm
  // VideoFeedItem'ların ortak atasında yaşıyor — useFeed'e hiç dokunulmuyor
  // (ayrı, kardeş bir hook). Hook'lar koşulsuz çağrılmalı (Rules of Hooks),
  // bu yüzden "success" durumundan önceki early return'lardan ÖNCE çağrılıyor;
  // henüz veri yokken boş dizi ile besleniyor.
  const items = feedState.status === "success" ? feedState.items : [];
  const { isSaved: isWordSaved, isPending: isWordPending, toggleSave: onToggleSaveWord } = useSavedWordIds(userId, items);
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
    // Chunk 15 — kullanıcı-dostu, teknik olmayan mesaj (madde 7): ham
    // `feedState.message` (örn. "Failed to fetch") artık DOĞRUDAN gösterilmiyor.
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.</Text>
      </View>
    );
  }

  const { nextCursor, isLoadingMore, loadMoreError } = feedState;
  const firstItem = items[0];
  const resolvedActiveItemKey = activeItemKey ?? (firstItem ? getFeedItemKey(firstItem) : null);

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
          // Quiz item'lar isActive'e tepki vermiyor — video gibi play/pause'a
          // ihtiyaçları yok, statik render Chunk 5 kapsamında yeterli.
          return <QuizFeedItem quiz={item.quiz} height={height} width={width} userId={userId} />;
        }}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
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
      {/* Chunk 16 — Memory'ye giden tek, küçük giriş noktası. Sabit konum,
          feed'in scroll/paging davranışını hiç etkilemiyor. */}
      <Pressable style={styles.memoryButton} onPress={onOpenMemory}>
        <Text style={styles.memoryButtonText}>📚 Kelimelerim</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  memoryButton: {
    position: "absolute",
    top: 56,
    right: 16,
    backgroundColor: "rgba(17,17,17,0.85)",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  memoryButtonText: {
    color: "#8ecdfa",
    fontSize: 13,
    fontWeight: "600",
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
