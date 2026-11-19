import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PassageLevel, PassagePage } from "@linguascroll/shared-types";
import { publishAccessVerified, resetAccessEventsForTests } from "../../subscription/access-events";
import { PassagesApiError } from "../api/passages-api";
import type { PassagesDeps } from "../passages-controller";
import { CAT_SPAN_1, CAT_SPAN_2, CAT_WORD_ID, makeAnswer, makeLockedPassage, makeOpenPassage, makePage, uuid } from "../passages-test-helpers";
import { PassagesFlow } from "./PassagesFlow";

jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const ReactActual = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: ({ visible, children, onRequestClose }: { visible?: boolean; children?: React.ReactNode; onRequestClose?: () => void }) => (visible ? ReactActual.createElement(View, { testID: "native-modal", onRequestClose }, children) : null) };
});
// Paywall'ın kendisi (RevenueCat/Firebase) bu testin konusu değil: erişim açma, onUnlocked + access-events ile sınanır.
let mockPaywallProps: { onUnlocked: () => void; reason?: string } | null = null;
jest.mock("../../subscription/PaywallFeedItem", () => {
  const ReactActual = require("react");
  const { Text } = require("react-native");
  return {
    PaywallFeedItem: (props: { onUnlocked: () => void; reason?: string }) => {
      mockPaywallProps = props;
      return ReactActual.createElement(Text, null, "PAYWALL-EKRANI");
    },
  };
});

jest.setTimeout(60_000);

const ACCOUNT = { isAnonymous: false, linking: false, notice: null, onLinkAccount: () => {} };
const USER = "00000000-0000-4000-8000-0000000000e1";

function makeDeps() {
  const fetchPassages = jest.fn<Promise<PassagePage>, [PassageLevel, string?]>();
  const answerPassageQuestion = jest.fn();
  const savePassageWord = jest.fn().mockResolvedValue({ created: true });
  const unsaveWord = jest.fn().mockResolvedValue(undefined);
  const deps: PassagesDeps = { fetchPassages, answerPassageQuestion, savePassageWord, unsaveWord, sleep: () => Promise.resolve() };
  return { deps, fetchPassages, answerPassageQuestion, savePassageWord, unsaveWord };
}

async function renderFlow(fakes: ReturnType<typeof makeDeps>, props: Partial<Parameters<typeof PassagesFlow>[0]> = {}) {
  const onBack = jest.fn();
  await render(<PassagesFlow userId={USER} account={ACCOUNT} onBack={onBack} deps={fakes.deps} {...props} />);
  // Gerçek cihazda onLayout ölçer; testte elle tetiklenir (viewport > 0 olunca sayfalar çizilir).
  await act(async () => {
    fireEvent(screen.getByTestId("passages-body"), "layout", { nativeEvent: { layout: { height: 800, width: 400 } } });
  });
  return { onBack };
}

beforeEach(() => {
  resetAccessEventsForTests();
  mockPaywallProps = null;
});

describe("metin sayfası ve ortak kelime penceresi", () => {
  it("ilk sayfa metin: başlık ve paragraf çizilir; kelimeler dokunulabilir (iki geçiş ayrı düğme)", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));
    await renderFlow(fakes);

    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    expect(screen.getAllByRole("button", { name: "cat, anlamını göster" })).toHaveLength(2);
    expect(fakes.fetchPassages).toHaveBeenCalledWith("B1");
  });

  it("DOKUNULAN geçişin anlamı ve kaynak cümlesi gösterilir ('Metne dön'); kaydet o geçişin span kimliğiyle gider", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());

    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[1]!); // İKİNCİ geçiş

    expect(screen.getByText("Metne dön")).toBeTruthy();
    expect(screen.queryByText("Videoya dön")).toBeNull();
    expect(screen.getByText("kedi")).toBeTruthy();
    expect(screen.getByText("The cat left.")).toBeTruthy(); // o geçişin cümlesi (ilk geçişinki değil)
    expect(screen.queryByText("A cat sat.")).toBeNull();

    await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
    await waitFor(() => expect(fakes.savePassageWord).toHaveBeenCalledWith(CAT_WORD_ID, uuid(1), CAT_SPAN_2));
    await waitFor(() => expect(screen.getByText("Kelimelerine eklendi ✓")).toBeTruthy());
  });

  it("birinci geçişe dokununca BİRİNCİ geçişin cümlesi ve span kimliği kullanılır", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());

    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[0]!);
    expect(screen.getByText("A cat sat.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Kelimelerime kaydet"));

    await waitFor(() => expect(fakes.savePassageWord).toHaveBeenCalledWith(CAT_WORD_ID, uuid(1), CAT_SPAN_1));
  });

  it("kaydetme HATASI kullanıcıya görünür; 'Tekrar dene' aynı işlemi yeniden dener ve başarıda kayıtlı görünür", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));
    fakes.savePassageWord.mockRejectedValueOnce(new TypeError("Network request failed"));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[0]!);

    await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
    await waitFor(() => expect(screen.getByText("Kelime işlemi tamamlanamadı. Tekrar dene.")).toBeTruthy());
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Kelimelerime kaydet")).toBeTruthy(); // durum değişmedi

    await fireEvent.press(screen.getByText("Tekrar dene"));
    await waitFor(() => expect(screen.getByText("Kelimelerine eklendi ✓")).toBeTruthy());
    expect(fakes.savePassageWord).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Kelime işlemi tamamlanamadı. Tekrar dene.")).toBeNull();
  });

  it("kayıtlı kelimeyi YALNIZ 'Kelimelerimden çıkar' çıkarır; çıkarma hatası görünür ve 'Tekrar dene' ÇIKARMAYI yeniden dener", async () => {
    const fakes = makeDeps();
    const saved = makeOpenPassage(1);
    saved.paragraphs = [[{ text: "A " }, { text: "cat", word: { wordId: CAT_WORD_ID, gloss: "kedi", saved: true, spanId: CAT_SPAN_1, contextSentence: "A cat sat." } }, { text: " sat." }]];
    fakes.fetchPassages.mockResolvedValue(makePage([saved]));
    fakes.unsaveWord.mockRejectedValueOnce(new PassagesApiError("x", 503));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "cat, anlamını göster" }));

    await fireEvent.press(screen.getByText("Kelimelerine eklendi ✓")); // ana düğme pasif
    expect(fakes.unsaveWord).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Kelimelerimden çıkar"));
    await waitFor(() => expect(screen.getByText("Kelime işlemi tamamlanamadı. Tekrar dene.")).toBeTruthy());
    expect(screen.getByText("Kelimelerine eklendi ✓")).toBeTruthy(); // başarısız çıkarma durumu değiştirmedi

    await fireEvent.press(screen.getByText("Tekrar dene"));
    await waitFor(() => expect(screen.getByText("Kelimelerime kaydet")).toBeTruthy());
    expect(fakes.unsaveWord).toHaveBeenCalledTimes(2);
    expect(fakes.savePassageWord).not.toHaveBeenCalled(); // yanlış yönde KAYDETME yok
  });

  it("eski kelime hatası pencere YENİDEN açılınca görünmez (hata yalnız ilgili işlemin hemen ardından anlamlı)", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));
    fakes.savePassageWord.mockRejectedValueOnce(new TypeError("Network request failed"));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[0]!);
    await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
    await waitFor(() => expect(screen.getByText("Kelime işlemi tamamlanamadı. Tekrar dene.")).toBeTruthy());
    await fireEvent.press(screen.getByText("Metne dön"));

    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[0]!);

    expect(screen.queryByText("Kelime işlemi tamamlanamadı. Tekrar dene.")).toBeNull();
    expect(screen.getByText("Kelimelerime kaydet")).toBeTruthy();
  });

  it("'Metne dön' pencereyi kapatır", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[0]!);

    await fireEvent.press(screen.getByText("Metne dön"));

    expect(screen.queryByText("Kelimelerime kaydet")).toBeNull();
  });
});

describe("soru sayfası: seçim, eleme, kontrol, sonuç, hatalar", () => {
  async function onFirstQuestion() {
    const fakes = makeDeps();
    const passage = makeOpenPassage(1);
    fakes.fetchPassages.mockResolvedValue(makePage([passage]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("Soru 1/4 · Detail".replace("Detail", "Ayrıntı"))).toBeTruthy());
    return { fakes, question: passage.questions[0]! };
  }

  it("seçim olmadan 'Kontrol et' pasif; seçince etkin ve YALNIZ optionId gider; sonuç doğru şık, kullanıcının cevabı, tuzak ve açıklamayı gösterir", async () => {
    const { fakes, question } = await onFirstQuestion();
    expect(screen.getByRole("button", { name: "Kontrol et", disabled: true })).toBeTruthy();

    await fireEvent.press(screen.getByRole("radio", { name: "B. o1" }));
    expect(screen.getByRole("button", { name: "Kontrol et", disabled: false })).toBeTruthy();
    fakes.answerPassageQuestion.mockResolvedValueOnce(makeAnswer(question, 1, 2));

    await fireEvent.press(screen.getByText("Kontrol et"));

    await waitFor(() => expect(fakes.answerPassageQuestion).toHaveBeenCalledWith(question.id, question.options[1]!.id));
    await waitFor(() => expect(screen.getByText("✓ Doğru cevap")).toBeTruthy());
    expect(screen.getByText("✗ Senin cevabın")).toBeTruthy();
    expect(screen.getAllByText("Tuzak: Metinden kopya").length).toBeGreaterThan(0);
    expect(screen.getAllByText("e").length).toBe(4); // her şıkkın açıklaması
    expect(screen.getByText("0 doğru · 1 yanlış · 3 cevaplanmadı")).toBeTruthy(); // canlı özet
    expect(screen.queryByText("Kontrol et")).toBeNull(); // ilk cevap sabit
  });

  it("✕ elemesi: elenen şık seçilemez ve üstü çizili/'elendi' etiketli; ↺ geri alır; son şık elenemez", async () => {
    const { fakes } = await onFirstQuestion();

    await fireEvent.press(screen.getByRole("button", { name: "A şıkkını ele" }));
    expect(screen.getByRole("radio", { name: "A. o0, elendi", disabled: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole("radio", { name: "A. o0, elendi", disabled: true }));
    expect(screen.getByRole("button", { name: "Kontrol et", disabled: true })).toBeTruthy(); // elenmiş şık seçilemedi

    await fireEvent.press(screen.getByRole("button", { name: "A şıkkı için elemeyi geri al" }));
    expect(screen.getByRole("radio", { name: "A. o0" })).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "A şıkkını ele" }));
    await fireEvent.press(screen.getByRole("button", { name: "B şıkkını ele" }));
    await fireEvent.press(screen.getByRole("button", { name: "C şıkkını ele" }));
    await fireEvent.press(screen.getByRole("button", { name: "D şıkkını ele" })); // SON seçilebilir şık: elenmez
    expect(screen.getByRole("radio", { name: "D. o3" })).toBeTruthy();
    expect(fakes.answerPassageQuestion).not.toHaveBeenCalled(); // eleme cevap göndermez
  });

  it("seçili şık elenirse seçim düşer ('Kontrol et' yeniden pasif)", async () => {
    await onFirstQuestion();
    await fireEvent.press(screen.getByRole("radio", { name: "C. o2" }));
    expect(screen.getByRole("button", { name: "Kontrol et", disabled: false })).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "C şıkkını ele" }));

    expect(screen.getByRole("button", { name: "Kontrol et", disabled: true })).toBeTruthy();
  });

  it("gönderim sürerken 'Gönderiliyor…' ve ikinci gönderim yok (çift dokunma)", async () => {
    const { fakes, question } = await onFirstQuestion();
    let finish!: (value: ReturnType<typeof makeAnswer>) => void;
    fakes.answerPassageQuestion.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await fireEvent.press(screen.getByRole("radio", { name: "A. o0" }));

    await fireEvent.press(screen.getByText("Kontrol et"));
    await waitFor(() => expect(screen.getByText("Gönderiliyor…")).toBeTruthy());
    await fireEvent.press(screen.getByText("Gönderiliyor…"));
    expect(fakes.answerPassageQuestion).toHaveBeenCalledTimes(1);

    await act(async () => { finish(makeAnswer(question, 0, 0)); });
    await waitFor(() => expect(screen.getByText("✓ Doğru cevap")).toBeTruthy());
  });

  it("zaman aşımı: 'Sonuç doğrulanamadı; tekrar kontrol et.' ('kaydedilmedi' DEĞİL) ve 'Tekrar kontrol et' saklanan ilk sonucu getirir", async () => {
    const { fakes, question } = await onFirstQuestion();
    fakes.answerPassageQuestion.mockRejectedValue(new PassagesApiError("timeout", undefined, true));
    await fireEvent.press(screen.getByRole("radio", { name: "B. o1" }));

    await fireEvent.press(screen.getByText("Kontrol et"));

    await waitFor(() => expect(screen.getByText("Sonuç doğrulanamadı; tekrar kontrol et.")).toBeTruthy());
    expect(screen.queryByText(/kaydedilmedi/i)).toBeNull();
    fakes.answerPassageQuestion.mockReset().mockResolvedValueOnce(makeAnswer(question, 1, 1)); // sunucuda saklı ilk sonuç

    await fireEvent.press(screen.getByText("Tekrar kontrol et"));

    await waitFor(() => expect(screen.getByText("✓ Doğru cevap")).toBeTruthy());
    expect(fakes.answerPassageQuestion).toHaveBeenCalledWith(question.id, question.options[1]!.id);
    expect(screen.queryByText("Sonuç doğrulanamadı; tekrar kontrol et.")).toBeNull();
  });

  it("'Tekrar kontrol et' kullanıcının sonradan seçtiği değil İLK DENENEN şıkkı yeniden gönderir (saklanan ilk sonuç kazanır)", async () => {
    const { fakes, question } = await onFirstQuestion();
    fakes.answerPassageQuestion.mockRejectedValue(new PassagesApiError("timeout", undefined, true));
    await fireEvent.press(screen.getByRole("radio", { name: "B. o1" }));
    await fireEvent.press(screen.getByText("Kontrol et"));
    await waitFor(() => expect(screen.getByText("Tekrar kontrol et")).toBeTruthy());

    await fireEvent.press(screen.getByRole("radio", { name: "C. o2" })); // kullanıcı bu arada başka şık seçti
    fakes.answerPassageQuestion.mockReset().mockResolvedValueOnce(makeAnswer(question, 1, 1));
    await fireEvent.press(screen.getByText("Tekrar kontrol et"));

    await waitFor(() => expect(fakes.answerPassageQuestion).toHaveBeenCalledWith(question.id, question.options[1]!.id)); // B, C değil
    expect(fakes.answerPassageQuestion).not.toHaveBeenCalledWith(question.id, question.options[2]!.id);
  });

  it("kesin ret (400) genel hata + 'Tekrar dene' (aynı seçimi yeniden gönderir)", async () => {
    const { fakes, question } = await onFirstQuestion();
    fakes.answerPassageQuestion.mockRejectedValueOnce(new PassagesApiError("x", 400));
    await fireEvent.press(screen.getByRole("radio", { name: "A. o0" }));
    await fireEvent.press(screen.getByText("Kontrol et"));
    await waitFor(() => expect(screen.getByText("Cevap gönderilemedi. Tekrar dene.")).toBeTruthy());
    fakes.answerPassageQuestion.mockResolvedValueOnce(makeAnswer(question, 0, 0));

    await fireEvent.press(screen.getByText("Tekrar dene"));

    await waitFor(() => expect(screen.getByText("✓ Doğru cevap")).toBeTruthy());
  });

  it("'Metni göster' soru sayfasından çıkmadan metni açar; 'Soruya dön' kapatır", async () => {
    await onFirstQuestion();

    const before = screen.getAllByText("A cat sat. The cat left.").length; // metin sayfası da aynı paragrafı çiziyor
    await fireEvent.press(screen.getByText("Metni göster"));
    expect(screen.getByText("Soruya dön")).toBeTruthy();
    expect(screen.getAllByText("A cat sat. The cat left.").length).toBe(before + 1);

    await fireEvent.press(screen.getByText("Soruya dön"));
    expect(screen.queryByText("Soruya dön")).toBeNull();
  });

  it("metin penceresindeki ikinci geçiş aynı native Modal içindeki ortak kartı açar; kapatınca metne geri döner", async () => {
    const { fakes } = await onFirstQuestion();
    await fireEvent.press(screen.getByText("Metni göster"));
    // İlk iki geçiş ana metindedir; son iki geçiş metin penceresindedir.
    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[3]!);
    expect(screen.getAllByTestId("native-modal")).toHaveLength(1);
    expect(screen.getByText("The cat left.")).toBeTruthy();
    expect(screen.queryByText("Soruya dön")).toBeNull(); // arka metin erişilebilirlik ağacından gizlidir
    await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
    await waitFor(() => expect(fakes.savePassageWord).toHaveBeenCalledWith(CAT_WORD_ID, uuid(1), CAT_SPAN_2));
    await fireEvent.press(screen.getByText("Metne dön"));
    expect(screen.getByText("Soruya dön")).toBeTruthy();
    expect(screen.queryByText("Metne dön")).toBeNull();
    await fireEvent.press(screen.getByText("Soruya dön"));
    expect(screen.queryByText("Soruya dön")).toBeNull();
  });

  it("metindeki kelime açıkken Android geri önce kelimeyi kapatır, metni kapatmaz", async () => {
    await onFirstQuestion();
    await fireEvent.press(screen.getByText("Metni göster"));
    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[3]!);
    await fireEvent(screen.getByTestId("native-modal"), "requestClose");
    expect(screen.getByText("Soruya dön")).toBeTruthy();
    expect(screen.queryByText("Metne dön")).toBeNull();
  });
});

describe("seviye, hata/boş durumlar, geri", () => {
  it("seviye düğmesi o seviyeyi çeker; seçili seviye erişilebilirlik durumunda 'selected'", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockImplementation((level) => Promise.resolve(makePage([makeOpenPassage(level === "B1" ? 1 : 2, { level, title: `Başlık ${level}` })])));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("Başlık B1")).toBeTruthy());
    expect(screen.getByRole("button", { name: "B1 seviyesi", selected: true })).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "C1 seviyesi" }));

    await waitFor(() => expect(screen.getByText("Başlık C1")).toBeTruthy());
    expect(fakes.fetchPassages).toHaveBeenCalledWith("C1");
    expect(screen.getByRole("button", { name: "C1 seviyesi", selected: true })).toBeTruthy();
  });

  it("başlangıç seviyesi prop'tan gelir (onboarding seviyesi)", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([]));
    await renderFlow(fakes, { initialLevel: "C2" });
    await waitFor(() => expect(fakes.fetchPassages).toHaveBeenCalledWith("C2"));
  });

  it("liste hatası: kullanıcı-dostu mesaj + 'Tekrar dene' yeniden çeker", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockRejectedValueOnce(new TypeError("Network request failed")).mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText(/Bağlantı kurulamadı/)).toBeTruthy());
    expect(screen.queryByText(/Network request failed/)).toBeNull();

    await fireEvent.press(screen.getByText("Tekrar dene"));

    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
  });

  it("boş seviye ve geri düğmesi", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([]));
    const { onBack } = await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("Bu seviyede henüz metin yok.")).toBeTruthy());

    await fireEvent.press(screen.getByText("‹ Keşfet"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("kilitli içerik ve erişim yenileme", () => {
  it("kilitli kart yalnız başlık/seviye/konu ve kilit mesajı gösterir; 'Premium'u gör' paywall'ı açar", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeLockedPassage(1)]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("🔒 Bu metin abonelikle açılır")).toBeTruthy());
    expect(screen.getByText("L1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /anlamını göster/ })).toBeNull();

    await fireEvent.press(screen.getByText("Premium'u gör"));

    expect(screen.getByText("PAYWALL-EKRANI")).toBeTruthy();
    expect(mockPaywallProps?.reason).toBe("upgrade");
  });

  it("satın alma/restore sunucuda doğrulanınca (erişim olayı) liste yeniden çekilir ve kilitli kart AÇIK metne dönüşür; paywall kapanır", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeLockedPassage(1)])).mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("Premium'u gör")).toBeTruthy());
    await fireEvent.press(screen.getByText("Premium'u gör"));
    expect(screen.getByText("PAYWALL-EKRANI")).toBeTruthy();

    await act(async () => {
      publishAccessVerified(USER, true); // use-paywall: refreshSubscription → active:true
      mockPaywallProps?.onUnlocked();
    });

    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    expect(screen.queryByText("PAYWALL-EKRANI")).toBeNull();
    expect(screen.queryByText("🔒 Bu metin abonelikle açılır")).toBeNull();
    expect(fakes.fetchPassages).toHaveBeenCalledTimes(2);
  });

  it("abonelik kaybı doğrulanınca açık içerik temizlenir, açık kelime penceresi kapanır; yeniden çekimde ücretli metin kilitli gelir", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)])).mockResolvedValueOnce(makePage([makeLockedPassage(1)]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    await fireEvent.press(screen.getAllByRole("button", { name: "cat, anlamını göster" })[0]!);
    expect(screen.getByText("Kelimelerime kaydet")).toBeTruthy();

    await act(async () => {
      publishAccessVerified(USER, false);
    });

    await waitFor(() => expect(screen.getByText("🔒 Bu metin abonelikle açılır")).toBeTruthy());
    expect(screen.queryByText("Kelimelerime kaydet")).toBeNull(); // açık pencere silinen içeriğe bağlı kalmadı
    expect(screen.queryByText("kedi")).toBeNull();
  });

  it("kayıtlı cevaplar erişim yenilemesinden sonra sunucudan geri gelir (özet korunur)", async () => {
    const fakes = makeDeps();
    const passage = makeOpenPassage(1);
    const stored = makeOpenPassage(1);
    stored.questions[0] = { ...passage.questions[0]!, result: makeAnswer(passage.questions[0]!, 0, 0) };
    fakes.fetchPassages.mockResolvedValueOnce(makePage([passage])).mockResolvedValueOnce(makePage([stored]));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());

    await act(async () => {
      publishAccessVerified(USER, false); // ekranda açık içerik var → sıfırla ve sunucudan yeniden çek
    });

    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("1 doğru · 0 yanlış · 3 cevaplanmadı")).toBeTruthy());
  });
});

describe("sayfalama: devam sayfası", () => {
  const nearEnd = async () => {
    await act(async () => {
      screen.getByTestId("passage-pager").props.onViewableItemsChanged({ viewableItems: [{ index: 5, item: {}, key: "x", isViewable: true }] });
    });
  };

  it("sona yaklaşınca devam sayfası istenir; HATA sonrası sayfa çevirmek OTOMATİK yeniden istek atmaz", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)], "c1")).mockRejectedValue(new TypeError("Network request failed"));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());
    expect(fakes.fetchPassages).toHaveBeenCalledTimes(1);

    await nearEnd();
    await waitFor(() => expect(fakes.fetchPassages).toHaveBeenCalledTimes(2));
    expect(fakes.fetchPassages).toHaveBeenLastCalledWith("B1", "c1");

    await nearEnd();
    await nearEnd();
    expect(fakes.fetchPassages).toHaveBeenCalledTimes(2); // hata sonrası yeni istek yok
  });

  it("seviyenin sonunda (nextCursor null) devam isteği atılmaz", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)], null));
    await renderFlow(fakes);
    await waitFor(() => expect(screen.getByText("T1")).toBeTruthy());

    await nearEnd();

    expect(fakes.fetchPassages).toHaveBeenCalledTimes(1);
  });
});
