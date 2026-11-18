import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { makeOpenPassage } from "../passages-test-helpers";
import { flattenPassagePages } from "../passages-state";
import { PageFrame } from "./PageFrame";
import { PassageEndPage } from "./PassageEndPage";
import { PassagePager } from "./PassagePager";

jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));
jest.setTimeout(60_000);

describe("PassageEndPage", () => {
  it("devam yükleniyor / seviye bitti / hata + 'Tekrar dene' durumları", async () => {
    const onRetry = jest.fn();
    const view = await render(<PassageEndPage height={800} width={400} loadMoreError={null} hasMore onRetry={onRetry} />);
    expect(screen.getByText("Devamı yükleniyor…")).toBeTruthy();

    await view.rerender(<PassageEndPage height={800} width={400} loadMoreError={null} hasMore={false} onRetry={onRetry} />);
    expect(screen.getByText(/Bu seviyedeki metinler bitti/)).toBeTruthy();
    expect(screen.queryByText("Tekrar dene")).toBeNull(); // otomatik yeniden başlama/yeniden deneme yok

    await view.rerender(<PassageEndPage height={800} width={400} loadMoreError="Bağlantı kurulamadı." hasMore onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    await fireEvent.press(screen.getByText("Tekrar dene"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("PassagePager", () => {
  const pages = flattenPassagePages([makeOpenPassage(1)]);

  it("sayfalar sırayla çizilir; bitiş sayfası renderEnd ile (sayfa yoksa tek başına)", async () => {
    await render(<PassagePager pages={[]} height={800} width={400} renderPage={() => <Text>sayfa</Text>} renderEnd={() => <Text>BİTİŞ</Text>} onNearEnd={() => {}} />);
    expect(screen.getByText("BİTİŞ")).toBeTruthy();
  });

  it("sona 3 sayfa kala devam sayfası istenir; başta istenmez", async () => {
    const onNearEnd = jest.fn();
    await render(<PassagePager pages={pages} height={800} width={400} renderPage={({ key }) => <Text>{key}</Text>} renderEnd={() => <Text>BİTİŞ</Text>} onNearEnd={onNearEnd} />);
    const list = screen.getByTestId("passage-pager");
    const view = (index: number) => ({ viewableItems: [{ index, item: {}, key: String(index), isViewable: true }] });

    list.props.onViewableItemsChanged(view(0));
    expect(onNearEnd).not.toHaveBeenCalled();

    list.props.onViewableItemsChanged(view(pages.length - 2)); // data.length = pages + END → son-3 eşiği
    expect(onNearEnd).toHaveBeenCalledTimes(1);
  });

  it("sayfa 'Sonraki' düğmesi bir sonraki sayfaya kaydırmayı ister (goNext), son sayfada taşmaz", async () => {
    const goNexts: Array<() => void> = [];
    await render(<PassagePager pages={pages} height={800} width={400} renderPage={({ key }, goNext) => { goNexts.push(goNext); return <Text>{key}</Text>; }} renderEnd={() => <Text>BİTİŞ</Text>} onNearEnd={() => {}} />);
    expect(goNexts.length).toBeGreaterThan(0);
    expect(() => goNexts[0]!()).not.toThrow();
    expect(() => goNexts[goNexts.length - 1]!()).not.toThrow();
  });
});

describe("kaydırma yapısı: sayfa geçişi YATAY, sayfa içi DİKEY (eksenler çakışmaz)", () => {
  const pages = flattenPassagePages([makeOpenPassage(1)]);

  it("pager yatay ve sayfa genişliğiyle düzenlenir; sayfa içi ScrollView dikey (horizontal değil)", async () => {
    await render(<PassagePager pages={pages} height={800} width={400} renderPage={() => <PageFrame height={800} width={400}><Text>içerik</Text></PageFrame>} renderEnd={() => <Text>BİTİŞ</Text>} onNearEnd={() => {}} />);
    const list = screen.getByTestId("passage-pager");

    expect(list.props.horizontal).toBe(true);
    expect(list.props.pagingEnabled).toBe(true);
    expect(list.props.getItemLayout(null, 3)).toEqual({ length: 400, offset: 1200, index: 3 }); // genişlik tabanlı

    const inner = collectProps(screen.toJSON()).filter((props) => "keyboardShouldPersistTaps" in props); // PageFrame'in ScrollView'ı
    expect(inner.length).toBeGreaterThan(0);
    expect(inner.every((props) => props.horizontal !== true)).toBe(true);
  });

  it("hiçbir ScrollView/FlatList'te nestedScrollEnabled/persistentScrollbar YOK (video akışını kıran kayıtlı gerileme, bkz. VideoFeedItem.test.tsx)", async () => {
    await render(<PassagePager pages={pages} height={800} width={400} renderPage={() => <PageFrame height={800} width={400}><Text>içerik</Text></PageFrame>} renderEnd={() => <Text>BİTİŞ</Text>} onNearEnd={() => {}} />);
    const offenders = collectProps(screen.toJSON()).filter((props) => props.nestedScrollEnabled !== undefined || props.persistentScrollbar !== undefined);
    expect(offenders).toEqual([]);
  });
});

type Json = { props?: Record<string, unknown>; children?: unknown } | string | null;
function collectProps(node: Json | Json[]): Array<Record<string, unknown>> {
  if (node === null || typeof node === "string") return [];
  if (Array.isArray(node)) return node.flatMap(collectProps);
  const here = node.props ? [node.props] : [];
  const children = Array.isArray(node.children) ? (node.children as Json[]) : [];
  return [...here, ...children.flatMap(collectProps)];
}

