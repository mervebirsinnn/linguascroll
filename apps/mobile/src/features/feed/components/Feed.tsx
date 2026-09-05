import { useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import type { FeedItem } from "@linguascroll/shared-types";
import { useFeed } from "../hooks/use-feed";
import { useSavedWordIds } from "../hooks/use-saved-word-ids";
import { FeedListFooter } from "./FeedListFooter";
import { getFeedItemKey } from "./get-feed-item-key";
import { QuizFeedItem } from "./QuizFeedItem";
import { VideoFeedItem } from "./VideoFeedItem";

// %90'ı ekranda olan öğe "aktif" kabul edilir. FlatList, bu prop'un render'lar
// arasında referans olarak sabit kalmasını bekler — bu yüzden useRef içinde tutuluyor.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 90 };

type FeedProps = {
  userId: string;
};

export function Feed({ userId }: FeedProps) {
  const { state: feedState, loadMore, refresh } = useFeed(userId);

  // Tek ölçüm kaynağı: hem FlatList'in paging hesabı (getItemLayout) hem de her
  // item'ın gerçek render boyutu buradan, tek yerden besleniyor.
  const { height, width } = useWindowDimensions();

  // Kullanıcının kaydırarak seçtiği item'ın key'i (bkz. getFeedItemKey — FeedItem
  // nested olduğu için düz bir "id" alanı yok). Kaydırma henüz başlamadıysa null
  // kalır — bu durumda ilk item, render sırasında varsayılan olarak aktif sayılır.
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);

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

  if (feedState.status === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Yükleniyor…</Text>
      </View>
    );
  }

  if (feedState.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Feed yüklenemedi: {feedState.message}</Text>
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
  const footerAction = nextCursor === null ? refresh : loadMore;

  return (
    <FlatList
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
  );
}

const styles = StyleSheet.create({
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
