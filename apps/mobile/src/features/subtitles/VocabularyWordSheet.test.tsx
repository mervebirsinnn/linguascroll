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

async function renderSheet(overrides: Partial<Parameters<typeof VocabularyWordSheet>[0]> = {}) {
  const props = { word: WORD, sentence: "I show it to my friend.", onClose: jest.fn(), isSaved: false, isPending: false, onSave: jest.fn(), onRemove: jest.fn(), ...overrides };
  const view = await render(<VocabularyWordSheet {...props} />);
  return { props, view };
}

// Dosyadaki İLK render RN modüllerinin soğuk yüklenmesini ödüyor (tam suite yük altında 5 sn varsayılanını aşabilir).
jest.setTimeout(60_000);

const REMOVE = "Kelimelerimden çıkar";

it("anlam, cümle, 'Kelimelerime kaydet' ve 'Videoya dön' gösterilir; kaydet YALNIZ onSave'i çağırır", async () => {
  const { props, view } = await renderSheet();
  expect(screen.getByText("show")).toBeTruthy();
  expect(screen.getByText("göstermek")).toBeTruthy();
  expect(screen.getByText("I show it to my friend.")).toBeTruthy();

  await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
  expect(props.onSave).toHaveBeenCalledTimes(1);
  expect(props.onRemove).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText("Videoya dön"));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

it("kayıtlıyken ana düğme pasif ('Kelimelerine eklendi ✓'); çıkarma YALNIZ ayrı düğmeyle ve onRemove'u çağırır", async () => {
  const { props, view } = await renderSheet({ isSaved: true });
  await fireEvent.press(screen.getByText("Kelimelerine eklendi ✓"));
  expect(props.onSave).not.toHaveBeenCalled();
  expect(props.onRemove).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText(REMOVE));
  expect(props.onRemove).toHaveBeenCalledTimes(1);
  expect(props.onSave).not.toHaveBeenCalled();
});

describe("yerleşim sabit: 'çıkar' satırı her zaman bağlı (yerleşimi kaydırıp 'Videoya dön'ün yerine geçmez)", () => {
  it("kayıtlı değilken satır yerleşimde VAR ama dokunulamaz ve erişilebilirlik ağacında yok; kayıtlıyken kullanılabilir", async () => {
    const unsaved = await renderSheet();
    // Ağaçta bağlı (yer tutuyor) …
    expect(screen.getByText(REMOVE, { includeHiddenElements: true })).toBeTruthy();
    // … ama erişilebilir değil ve basılamaz.
    expect(screen.queryByText(REMOVE)).toBeNull();
    await fireEvent.press(screen.getByText(REMOVE, { includeHiddenElements: true }));
    expect(unsaved.props.onRemove).not.toHaveBeenCalled();

    await unsaved.view.unmount();
    const saved = await renderSheet({ isSaved: true });
    expect(screen.getByText(REMOVE)).toBeTruthy();
    expect(screen.getByRole("button", { name: REMOVE })).toBeTruthy();
  });

  it("sıra ve sayı değişmez: kaydet → 'Videoya dön' → 'çıkar' satırı kaydedilmeden önce de sonra da aynı sırada bağlı", async () => {
    const before = await renderSheet();
    const order = () => screen.getAllByText(/Kelimelerime kaydet|Kelimelerine eklendi|Kaydediliyor|Kaldırılıyor|Videoya dön|Kelimelerimden çıkar/, { includeHiddenElements: true }).map((node) => node.props.children);
    const unsavedOrder = order();
    expect(unsavedOrder).toEqual(["Kelimelerime kaydet", "Videoya dön", "Kelimelerimden çıkar"]);

    await before.view.unmount();
    const after = await renderSheet({ isSaved: true });
    expect(order()).toEqual(["Kelimelerine eklendi ✓", "Videoya dön", "Kelimelerimden çıkar"]);
  });
});

describe("bekleme (isPending)", () => {
  it("kaydederken 'Kaydediliyor…', basılamaz, çıkar satırı kullanılamaz; erişilebilirlik durumu busy+disabled", async () => {
    const { props, view } = await renderSheet({ isPending: true });
    expect(screen.getByText("Kaydediliyor…")).toBeTruthy();
    expect(screen.queryByText(REMOVE)).toBeNull();

    await fireEvent.press(screen.getByText("Kaydediliyor…"));
    expect(props.onSave).not.toHaveBeenCalled();
    expect(props.onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Kaydediliyor…", disabled: true, busy: true })).toBeTruthy();
  });

  it("çıkarırken etiket YÖNÜ doğru söyler ('Kaldırılıyor…'), 'Kaydediliyor…' DEĞİL", async () => {
    const props = { word: WORD, sentence: "s", onClose: jest.fn(), onSave: jest.fn(), onRemove: jest.fn() };
    const view = await render(<VocabularyWordSheet {...props} isSaved isPending={false} />);
    await fireEvent.press(screen.getByText(REMOVE));
    expect(props.onRemove).toHaveBeenCalledTimes(1);

    await view.rerender(<VocabularyWordSheet {...props} isSaved isPending />);
    expect(screen.getByText("Kaldırılıyor…")).toBeTruthy();
    expect(screen.queryByText("Kaydediliyor…")).toBeNull();

    await view.rerender(<VocabularyWordSheet {...props} isSaved={false} isPending={false} />);
    expect(screen.getByText("Kelimelerime kaydet")).toBeTruthy(); // niyet bekleme bitince sıfırlandı
  });

  it("kaydet → bekleme sırasında etiket 'Kaydediliyor…' (niyet save)", async () => {
    const props = { word: WORD, sentence: "s", onClose: jest.fn(), onSave: jest.fn(), onRemove: jest.fn() };
    const view = await render(<VocabularyWordSheet {...props} isSaved={false} isPending={false} />);
    await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
    await view.rerender(<VocabularyWordSheet {...props} isSaved={false} isPending />);
    expect(screen.getByText("Kaydediliyor…")).toBeTruthy();
  });
});

describe("erişilebilirlik", () => {
  it("üç düğme 'button' rolünde; ana düğme kayıtlı değilken etkin, çıkar düğmesi ipucu taşır", async () => {
    const { view } = await renderSheet({ isSaved: true });
    expect(screen.getByRole("button", { name: "Videoya dön" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kelimelerine eklendi ✓", disabled: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: REMOVE })).toHaveProp("accessibilityHint", "Kelimeyi kayıtlı kelimelerinden siler");
  });
});

describe("cümle", () => {
  it("cümle yoksa ya da boş string ise cümle satırı çizilmez ve çökmez", async () => {
    const undefinedSentence = await renderSheet({ sentence: undefined });
    expect(screen.queryByText("I show it to my friend.")).toBeNull();
    await undefinedSentence.view.unmount();

    const emptySentence = await renderSheet({ sentence: "" });
    expect(screen.getByText("show")).toBeTruthy();
    expect(screen.getByText("Kelimelerime kaydet")).toBeTruthy();
  });
});

it("word null ise (sheet kapalı) hiçbir şey çizilmez", async () => {
  const { view } = await renderSheet({ word: null });
  expect(screen.queryByText("Videoya dön")).toBeNull();
  expect(screen.queryByText(REMOVE, { includeHiddenElements: true })).toBeNull();
});
