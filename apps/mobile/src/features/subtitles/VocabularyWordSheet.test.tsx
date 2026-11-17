import { fireEvent, render, screen } from "@testing-library/react-native";
import type { VideoVocabularyItem } from "@linguascroll/shared-types";
import { VocabularyWordSheet } from "./VocabularyWordSheet";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const ReactActual = require("react");
  return { __esModule: true, default: ({ visible, children }: { visible?: boolean; children?: React.ReactNode }) => visible ? ReactActual.createElement(ReactActual.Fragment, null, children) : null };
});

/** 2026-11-17 — seçilmiş (yeşil) kelime penceresi, altyazı kelimesi penceresiyle aynı görünüm ve metinlerde. */
const WORD: VideoVocabularyItem = { word: { id: "00000000-0000-4000-8000-000000000001", language: "en", lemma: "show", gloss: "göstermek" }, saved: false };

function renderSheet(overrides: Partial<Parameters<typeof VocabularyWordSheet>[0]> = {}) {
  const props = { word: WORD, sentence: "I show it to my friend.", onClose: jest.fn(), isSaved: false, isPending: false, onToggleSave: jest.fn(), ...overrides };
  return { props, view: render(<VocabularyWordSheet {...props} />) };
}

jest.setTimeout(60_000);

it("anlam, cümle, 'Kelimelerime kaydet' ve 'Videoya dön' gösterilir; kaydet onToggleSave'i çağırır", async () => {
  const { props, view } = renderSheet();
  await view;
  expect(screen.getByText("show")).toBeTruthy();
  expect(screen.getByText("göstermek")).toBeTruthy();
  expect(screen.getByText("I show it to my friend.")).toBeTruthy();
  expect(screen.queryByText("Kelimelerimden çıkar")).toBeNull();

  await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
  expect(props.onToggleSave).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByText("Videoya dön"));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

it("kayıtlıyken ana düğme pasif ('Kelimelerine eklendi ✓'); çıkarma yalnız ayrı bağlantıyla", async () => {
  const { props, view } = renderSheet({ isSaved: true });
  await view;
  await fireEvent.press(screen.getByText("Kelimelerine eklendi ✓"));
  expect(props.onToggleSave).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText("Kelimelerimden çıkar"));
  expect(props.onToggleSave).toHaveBeenCalledTimes(1);
});

it("istek sürerken 'Kaydediliyor…' ve çıkarma bağlantısı gizli", async () => {
  const { view } = renderSheet({ isSaved: true, isPending: true });
  await view;
  expect(screen.getByText("Kaydediliyor…")).toBeTruthy();
  expect(screen.queryByText("Kelimelerimden çıkar")).toBeNull();
});

it("cümle yoksa cümle satırı çizilmez", async () => {
  const { view } = renderSheet({ sentence: undefined });
  await view;
  expect(screen.queryByText("I show it to my friend.")).toBeNull();
});
