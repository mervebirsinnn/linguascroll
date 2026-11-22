import { useCallback, useRef, type ReactElement } from "react";
import { FlatList, type ViewToken } from "react-native";
import type { FlatPage } from "../passages-state";

/** Listenin sonundaki yapay "bitiş" sayfası (yükleniyor / hata + tekrar dene / seviye sonu) için işaretçi öğe. */
export const END_ITEM = { key: "__end__", end: true as const };
export type PagerItem = FlatPage | typeof END_ITEM;

export function isEndItem(item: PagerItem): item is typeof END_ITEM {
  return "end" in item;
}

type PassagePagerProps = {
  pages: readonly FlatPage[];
  height: number;
  width: number;
  /** Bir sayfanın içeriği; `goNext` sayfanın "Sonraki" düğmesi için bir sonraki sayfaya kaydırır, `goPrev` "Önceki" için bir öncekine (ilk sayfada undefined). */
  renderPage: (item: FlatPage, goNext: () => void, goPrev?: () => void) => ReactElement;
  renderEnd: () => ReactElement;
  onNearEnd: () => void;
  /** Seviye değişince/erişim yenilenince liste başa dönsün diye üst bileşen anahtarla yeniden kurar. */
};

// Feed ile AYNI sayfalama sabitleri mantığı: aktif + yakın komşular; her sayfa tam ekran (genişlik x yükseklik).
const WINDOW_SIZE = 5;
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/**
 * YATAY sayfa pager'ı: pagingEnabled FlatList, her öğe TAM sayfa (getItemLayout: genişlik). Sayfalar arası geçiş SAĞA/SOLA kaydırma,
 * sayfa içi uzun içerik DİKEY kaydırma (PageFrame'in ScrollView'ı): iki kaydırma FARKLI eksende olduğu için iç içe aynı-eksen
 * çakışması (iOS'ta sayfa kaydırmasını engelleme, Android'de iç ScrollView'ın hiç kaydırılamaması) YAPISAL olarak yoktur ve
 * `nestedScrollEnabled` gerekmez (bu repoda aynı prop'un video akışını kıran kayıtlı bir gerilemesi var; bilerek EKLENMEDİ).
 * Her sayfa ayrıca kendi "Sonraki" düğmesiyle `scrollToIndex` çağırır.
 */
export function PassagePager({ pages, height, width, renderPage, renderEnd, onNearEnd }: PassagePagerProps) {
  const listRef = useRef<FlatList<PagerItem>>(null);
  const data: PagerItem[] = [...pages, END_ITEM];

  const goTo = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  // Sona 3 sayfa kala (ya da bitiş sayfasına gelince) devam sayfası istenir; onViewableItemsChanged kararlı kalmalı (FlatList kuralı),
  // bu yüzden güncel değerler ref'lerden okunur.
  const lengthRef = useRef(data.length);
  lengthRef.current = data.length;
  const onNearEndRef = useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;
  const viewabilityRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const last = viewableItems[viewableItems.length - 1];
    if (last && typeof last.index === "number" && last.index >= lengthRef.current - 3) onNearEndRef.current();
  });

  return (
    <FlatList
      ref={listRef}
      testID="passage-pager"
      data={data}
      keyExtractor={(item) => item.key}
      renderItem={({ item, index }) => (isEndItem(item) ? renderEnd() : renderPage(item, () => goTo(Math.min(index + 1, data.length - 1)), index > 0 ? () => goTo(index - 1) : undefined))}
      horizontal
      getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      pagingEnabled
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      windowSize={WINDOW_SIZE}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      viewabilityConfig={VIEWABILITY_CONFIG}
      onViewableItemsChanged={viewabilityRef.current}
      style={{ width, height }}
    />
  );
}
