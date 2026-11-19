import { AccessibilityInfo } from "react-native";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { VocabularyWordSheet } from "./VocabularyWordSheet";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const ReactActual = require("react");
  return { __esModule: true, default: ({ visible, children }: { visible?: boolean; children?: React.ReactNode }) => visible ? ReactActual.createElement(ReactActual.Fragment, null, children) : null };
});

/** 2026-11-17 — seçilmiş (yeşil) kelime penceresi, altyazı kelimesi penceresiyle aynı görünüm ve metinlerde. */
const ENTRY = { title: "show", gloss: "göstermek" };

async function renderSheet(overrides: Partial<Parameters<typeof VocabularyWordSheet>[0]> = {}) {
  const props = { entry: ENTRY, sentence: "I show it to my friend.", onClose: jest.fn(), isSaved: false, isPending: false, onSave: jest.fn(), onRemove: jest.fn(), ...overrides };
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
    const props = { entry: ENTRY, sentence: "s", onClose: jest.fn(), onSave: jest.fn(), onRemove: jest.fn() };
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
    const props = { entry: ENTRY, sentence: "s", onClose: jest.fn(), onSave: jest.fn(), onRemove: jest.fn() };
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

it("entry null ise (sheet kapalı) hiçbir şey çizilmez", async () => {
  const { view } = await renderSheet({ entry: null });
  expect(screen.queryByText("Videoya dön")).toBeNull();
  expect(screen.queryByText(REMOVE, { includeHiddenElements: true })).toBeNull();
});

describe("genelleştirme (okuma pratiği): kapatma metni, görünür hata, gizli satır stili", () => {
  it("closeLabel verilirse kapatma düğmesi o metni taşır ('Metne dön') ve onClose'u çağırır; varsayılan 'Videoya dön'", async () => {
    const custom = await renderSheet({ closeLabel: "Metne dön" });
    expect(screen.getByText("Metne dön")).toBeTruthy();
    expect(screen.queryByText("Videoya dön")).toBeNull();
    await fireEvent.press(screen.getByText("Metne dön"));
    expect(custom.props.onClose).toHaveBeenCalledTimes(1);
  });

  it("hata verilirse görünür (alert rolü) ve 'Tekrar dene' kayıtsızken KAYDET niyetini yeniden dener", async () => {
    const { props } = await renderSheet({ error: "Kelime işlemi tamamlanamadı. Tekrar dene." });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Kelime işlemi tamamlanamadı. Tekrar dene.")).toBeTruthy();

    await fireEvent.press(screen.getByText("Tekrar dene"));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onRemove).not.toHaveBeenCalled();
  });

  it("kayıtlıyken 'Tekrar dene' ÇIKAR niyetini yeniden dener (başarısız çıkarma durumu değiştirmez)", async () => {
    const { props } = await renderSheet({ isSaved: true, error: "Kelime işlemi tamamlanamadı. Tekrar dene." });
    await fireEvent.press(screen.getByText("Tekrar dene"));
    expect(props.onRemove).toHaveBeenCalledTimes(1);
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("hata verilmezse (video akışı) hata kutusu ve 'Tekrar dene' hiç çizilmez", async () => {
    await renderSheet();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Tekrar dene")).toBeNull();
  });

  it("gizli çıkar satırının YER TUTAN stili sabit: opacity 0 ama minHeight 44 korunur, display none DEĞİL (M1 gerilemesini yakalar)", async () => {
    await renderSheet();
    const hidden = screen.getByRole("button", { name: "Kelimelerimden çıkar", includeHiddenElements: true });
    expect(hidden).toHaveStyle({ opacity: 0, minHeight: 44 });
    expect(hidden).not.toHaveStyle({ display: "none" });
  });

  it("çıkarma beklerken satır görünür kalır ama pasif (odak kaybolmaz, basılamaz)", async () => {
    const { props } = await renderSheet({ isSaved: true, isPending: true });
    const row = screen.getByRole("button", { name: "Kelimelerimden çıkar", disabled: true });
    expect(row).toBeTruthy();
    await fireEvent.press(screen.getByText("Kelimelerimden çıkar"));
    expect(props.onRemove).not.toHaveBeenCalled();
  });
});

describe("review düzeltmeleri: taşma, duyuru, düğme durumu, stil pinleri", () => {
  it("hata belirince ekran okuyucuya duyurulur (assertive canlı bölge + programatik duyuru); hata yokken duyuru yok", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    announce.mockClear(); // RN jest kurulumunda zaten bir mock olabilir: önceki testlerin çağrıları sayılmasın
    const view = await render(<VocabularyWordSheet entry={ENTRY} onClose={jest.fn()} isSaved={false} isPending={false} onSave={jest.fn()} onRemove={jest.fn()} />);
    expect(announce).not.toHaveBeenCalled();

    await view.rerender(<VocabularyWordSheet entry={ENTRY} error="Kelime işlemi tamamlanamadı. Tekrar dene." onClose={jest.fn()} isSaved={false} isPending={false} onSave={jest.fn()} onRemove={jest.fn()} />);

    expect(announce).toHaveBeenCalledWith("Kelime işlemi tamamlanamadı. Tekrar dene.");
    expect(screen.getByRole("alert")).toHaveProp("accessibilityLiveRegion", "assertive");
    announce.mockRestore();
  });

  it("'Tekrar dene' yönü etiketinde söyler (kaydetmeyi/çıkarmayı) ve bekleme sırasında pasif + soluk", async () => {
    const unsaved = await renderSheet({ error: "hata" });
    expect(screen.getByRole("button", { name: "Kaydetmeyi tekrar dene" })).toBeTruthy();
    await unsaved.view.unmount();

    const saved = await renderSheet({ isSaved: true, error: "hata", isPending: true });
    const retry = screen.getByRole("button", { name: "Çıkarmayı tekrar dene", disabled: true, busy: true });
    expect(retry).toHaveStyle({ opacity: 0.5 });
    await fireEvent.press(retry);
    expect(saved.props.onRemove).not.toHaveBeenCalled();
  });

  it("kart ekranı aşmaz (maxHeight) ve bilgi alanı kaydırılır; DÜĞMELER kaydırılan alanın dışında (hata kutusu düğmeleri itemez)", async () => {
    await renderSheet({ sentence: "Çok uzun bir cümle. ".repeat(40), error: "hata" });
    const card = screen.getByTestId("word-sheet-card");
    expect(card).toHaveStyle({ maxHeight: "88%" }); // kart ekranı aşmaz
    // Başlık/cümle/hata bilgi ScrollView'ının İÇİNDE; düğmeler DIŞINDA (hata kutusu düğmeleri itemez).
    const info = within(screen.getByTestId("word-sheet-info"));
    expect(info.getByText("show")).toBeTruthy();
    expect(info.getByText("hata")).toBeTruthy();
    expect(info.queryByText("Kelimelerime kaydet")).toBeNull();
    expect(info.queryByText("Videoya dön")).toBeNull();
    expect(info.queryByText("Kelimelerimden çıkar", { includeHiddenElements: true })).toBeNull();
  });

  it("stil pinleri: çıkar satırı marginTop 12 (kapat düğmesinden ayrı), bekleme sırasında opacity 0.5 görünür", async () => {
    await renderSheet({ isSaved: true });
    expect(screen.getByRole("button", { name: "Kelimelerimden çıkar" })).toHaveStyle({ marginTop: 12, minHeight: 44 });
    await screen.unmount();
    await renderSheet({ isSaved: true, isPending: true });
    expect(screen.getByRole("button", { name: "Kelimelerimden çıkar", disabled: true })).toHaveStyle({ opacity: 0.5 });
  });
});
