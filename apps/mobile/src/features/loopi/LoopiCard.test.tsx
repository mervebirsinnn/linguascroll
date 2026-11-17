import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { LoopiCard } from "./LoopiCard";
import type { SavedWordForReveal } from "./loopi-state";

/**
 * 2026-11-17 — Loopi kartının dört durumu (taslaktaki ekranlar) + hareketi azalt. Depo gerçek mantıkla
 * (createLoopiStore) ama bellekte; AsyncStorage native modülü yüklenmez.
 */
jest.mock("./loopi-store-instance", () => {
  const { createLoopiStore } = jest.requireActual("./loopi-store");
  const data = new Map<string, string>();
  return {
    mockData: data,
    loopiStore: createLoopiStore({
      getItem: async (key: string) => data.get(key) ?? null,
      setItem: async (key: string, value: string) => void data.set(key, value),
      removeItem: async (key: string) => void data.delete(key),
    }),
  };
});
const { mockData } = jest.requireMock("./loopi-store-instance") as { mockData: Map<string, string> };

// Loopi dekoratif (ekran okuyucudan gizli) — RNTL gizli öğeleri varsayılan olarak sorgulamaz.
const HIDDEN = { includeHiddenElements: true } as const;
const USER = "user-1";
const KEY = `looplish.loopi.v1.${USER}`;

function word(id: string, lemma: string, minute = 0): SavedWordForReveal {
  return { word: { id, lemma }, savedAt: new Date(Date.UTC(2026, 10, 17, 9, minute)).toISOString() };
}

function seed(seenStage: number | null, pending: string[]): void {
  mockData.set(KEY, JSON.stringify({ version: 1, seenStage, pending }));
}

function setReduceMotion(enabled: boolean): void {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(enabled);
}

beforeEach(() => {
  mockData.clear();
  jest.restoreAllMocks();
});

jest.setTimeout(60_000);

it("0 kelime: uykulu Loopi, kesik çizgili boş hap, 0 / 1", async () => {
  setReduceMotion(false);
  await render(<LoopiCard userId={USER} savedWords={[]} />);

  expect(screen.getByText("Loopi ilk kelimesini bekliyor")).toBeTruthy();
  expect(screen.getByText("Videoda bir kelimeye dokun ve kaydet.")).toBeTruthy();
  expect(screen.getByText("0 / 1")).toBeTruthy();
  await screen.findByTestId("loopi-ghost-pill", HIDDEN);
  expect(screen.getByTestId("loopi-face-sleepy", HIDDEN)).toBeTruthy();
  expect(screen.queryAllByTestId("loopi-bead", HIDDEN)).toHaveLength(0);
});

it("ilk kelime: hapta GERÇEK kelime, yutma oynar ve görüldü hemen yazılır", async () => {
  setReduceMotion(false);
  seed(0, ["A"]);
  await render(<LoopiCard userId={USER} savedWords={[word("A", "tomato")]} />);

  expect(screen.getByText("İlk kelimen: tomato")).toBeTruthy();
  expect(screen.getByText("1 / 3")).toBeTruthy();
  await screen.findByTestId("loopi-pill", HIDDEN);
  // Başlıktaki vurgu + hap: ikisi de gerçekten kaydedilen kelime.
  expect(screen.getAllByText("tomato", { exact: true, ...HIDDEN })).toHaveLength(2);
  await waitFor(() => expect(JSON.parse(mockData.get(KEY)!)).toEqual({ version: 1, seenStage: 1, pending: [] }));
});

it("8 kelime toplu kayıt: en yeni kelimenin hapı + '+3' rozeti, 8 / 15", async () => {
  setReduceMotion(false);
  seed(2, ["P", "Q", "R", "S"]);
  const words = [word("o1", "a"), word("o2", "b"), word("o3", "c"), word("o4", "d"), word("P", "cut", 1), word("Q", "pieces", 9), word("R", "slice", 3), word("S", "bowl", 2)];
  await render(<LoopiCard userId={USER} savedWords={words} />);

  expect(screen.getByText("8 kelime topladın")).toBeTruthy();
  expect(screen.getByText("8 / 15")).toBeTruthy();
  await screen.findByTestId("loopi-pill", HIDDEN);
  expect(screen.getByText("+3", HIDDEN)).toBeTruthy();
  expect(screen.getByText("Yeni: pieces ve 3 kelime daha")).toBeTruthy();
  expect(screen.getAllByTestId("loopi-bead", HIDDEN)).toHaveLength(3);
});

it("128 kelime: yedi boncuk, çubuk yerine '100 kelimelik hedef tamamlandı'", async () => {
  setReduceMotion(false);
  seed(7, []);
  const words = Array.from({ length: 128 }, (_, i) => word(`w${i}`, `w${i}`));
  await render(<LoopiCard userId={USER} savedWords={words} />);

  expect(screen.getByText("128 kelime topladın")).toBeTruthy();
  expect(screen.getByText("✓ 100 kelimelik hedef tamamlandı")).toBeTruthy();
  await waitFor(() => expect(screen.getAllByTestId("loopi-bead", HIDDEN)).toHaveLength(7));
  expect(screen.queryByTestId("loopi-pill", HIDDEN)).toBeNull();
});

it("hareketi azalt açık: hap/animasyon yok, son boy ve metin doğrudan; görüldü yine yazılır", async () => {
  setReduceMotion(true);
  seed(2, ["Q"]);
  const words = [...Array.from({ length: 7 }, (_, i) => word(`o${i}`, `o${i}`)), word("Q", "pieces", 9)];
  await render(<LoopiCard userId={USER} savedWords={words} />);

  await waitFor(() => expect(screen.getAllByTestId("loopi-bead", HIDDEN)).toHaveLength(3));
  expect(screen.queryByTestId("loopi-pill", HIDDEN)).toBeNull();
  expect(screen.getByText("Yeni: pieces")).toBeTruthy();
  expect(screen.getByTestId("loopi-face-happy", HIDDEN)).toBeTruthy();
  await waitFor(() => expect(JSON.parse(mockData.get(KEY)!).seenStage).toBe(3));
});

it("StrictMode (efekt → temizlik → efekt): açılış bir kez yapılır, kart 'loading'de kalmaz, hap kaybolmaz", async () => {
  setReduceMotion(false);
  seed(0, ["A"]);
  await render(
    <StrictMode>
      <LoopiCard userId={USER} savedWords={[word("A", "tomato")]} />
    </StrictMode>,
  );
  await screen.findByTestId("loopi-pill", HIDDEN);
  await waitFor(() => expect(JSON.parse(mockData.get(KEY)!)).toEqual({ version: 1, seenStage: 1, pending: [] }));
});

it("yeni cihaz (durum yok), 20 kelime: sessiz başlangıç — hap yok, mevcut boy", async () => {
  setReduceMotion(false);
  const words = Array.from({ length: 20 }, (_, i) => word(`w${i}`, `w${i}`));
  await render(<LoopiCard userId={USER} savedWords={words} />);

  await waitFor(() => expect(screen.getAllByTestId("loopi-bead", HIDDEN)).toHaveLength(4));
  expect(screen.queryByTestId("loopi-pill", HIDDEN)).toBeNull();
  expect(screen.getByTestId("loopi-face-curious", HIDDEN)).toBeTruthy();
  await waitFor(() => expect(JSON.parse(mockData.get(KEY)!).seenStage).toBe(4));
});
